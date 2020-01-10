/* ***********************************************************************
 *
 *   ID3 parser (ALPHA)
 *
 *   Copyright (c) 2019-2020 Silverspex
 *
 * *********************************************************************/

'use strict';

const maxSupportedVersion = 0x0400;

const Path = require('path');
const fs = require('fs');
const iconv = require('iconv-lite');

const {
  FRAMESV10, FRAMESV11, FRAMESV22, FRAMESV23, FRAMESV24, FRAMENAME,
  VERSIONS, GENRES, PICTYPE, OPTIMIZE, TAGTYPE, ENCTYPE, LYRICSNAME
} = require('./const');

function _err(txt, isWarn = false) {
  return { errors: [ _errStr(txt, isWarn) ] };
}

function _errStr(txt, isWarn = false) {
  return `${ isWarn ? 'WRN:' : 'ERR:' } ${ txt }`
}

/**
 *
 * @param filename - file name of file to parse for tags
 * @param options
 * @returns {*} - Object with key info, tags: array holding all tags found based on options
 */
function getid3(filename, options = {}) {
  const tags = [];
  const errors = [];
  let fileSize = 0;
  let pos = 0;

  options = Object.assign({
    onlyFirst: true,
    types    : TAGTYPE.ID3V23 | TAGTYPE.ID3V24,
    minSize  : 256,
    maxSize  : 100 << 20,  // 100 mb
    blockSize: 4096
  }, options);

  /*
    - read 4kb
    - convert header size
    - if tag > 4kb, read and append remaining buffer
    - if onlyFirst, done
    - if not onlyFirst, scan rest of file for additional tags, buffer with 3 bytes overlap, repeat previous procedure
    - if ID3V10/11 read end - 128 bytes
    - if ID3V24 also check end for footer end - 10 (3DI identifier), if not one in the beginning

    For these reasons, use Node native Buffer object.
   */

  try {
    // get size of file
    fileSize = fs.statSync(filename).size;
    if ( fileSize < options.minSize || fileSize > options.maxSize ) {
      return _err('File size outsize min/max limits. See options.', true);
    }
  }
  catch(err) {
    return _err(err.message);
  }

  const fd = fs.openSync(filename, 'r');

  // --- Check for ID3V2 tags ---
  if ( options.types & TAGTYPE.ID3V22 || options.types & TAGTYPE.ID3V23 || options.types & TAGTYPE.ID3V24 ) {
    const head = Buffer.alloc(options.blockSize);
    const read = fs.readSync(fd, head, 0, options.blockSize, 0);

    if ( read > 30 ) {
      const id3v2 = head.readUInt32BE(0) & 0xffffff00;

      // found the tag in the beginning
      if ( id3v2 === 0x49443300 ) { // 'ID3'
        const versionRaw = head.readUInt16BE(3);

        if ( (options.types & TAGTYPE.ID3V22 && versionRaw === 0x0200) ||
          (options.types & TAGTYPE.ID3V23 && versionRaw === 0x0300) ||
          (options.types & TAGTYPE.ID3V24 && versionRaw === 0x0400) ) {

          const version = getVersion2(versionRaw);
          const flags = head.readUInt8(5);
          const isUnsynced = !!(flags & 0x80);
          const isCompressed = versionRaw === 0x0200 ? !!(flags && 0x40) : false;
          const isExtended = versionRaw === 0x0200 ? false : !!(flags && 0x40);
          const isExperimental = !!(flags && 0x20);
          const isFooter = versionRaw === 0x0400 ? !!(flags && 0x10) : false;

          const tagSize = decodeSize(head.readUInt32BE(6));
          const tag = Buffer.allocUnsafe(tagSize + 10);

          if ( versionRaw <= maxSupportedVersion ) {
            // check size
            if ( tagSize + 10 <= options.blockSize ) {
              // extract from buffer
              head.copy(tag, 0, 0, tagSize + 10);
            }
            else {
              // read remaining into buffer todo: check if rereading is faster than appending
              head.copy(tag, 0, 0);
              fs.readSync(fd, tag, options.blockSize, tagSize + 10 - options.blockSize, options.blockSize);
            }

            if ( isUnsynced ) {
              if ( versionRaw === 0x0300 ) syncTag23(tag);
              else if ( versionRaw === 0x0400 ) syncTag24(tag);
            }

            pos += tagSize + 10;

            tags.push({
              type: 'ID3V2', version, versionRaw, filepos: 0, size: tagSize + 10, tag, flags: {
                isUnsynced, isCompressed, isExtended, isExperimental, isFooter
              }
            });
          }
        }

      }
    }

    if ( !options.onlyFirst && pos + 10 < fileSize ) {
      // todo search entire file
      if ( options.types & TAGTYPE.ID3V24 ) {
        // todo check footer tag at end of file
      }
    }
  }

  // --- Check for ID3V1 tag ---
  if ( options.types & TAGTYPE.ID3V10 || options.types & TAGTYPE.ID3V11 ) {
    const foot = Buffer.alloc(128);
    fs.readSync(fd, foot, 0, 128, fileSize - 128);
    const id3v1 = foot.readUInt32BE(0) & 0xffffff00;
    if ( id3v1 === 0x54414700 ) { // 'TAG'
      const is11 = foot.readUInt8(125) === 0 && foot.readUInt8(126);
      tags.push({
        type: 'ID3V1', version: is11 ? 1.1 : 1.0, versionRaw: is11 ? 0x0101 : 0x0100, filepos: fileSize - 128, size: 128, tag: foot, flags: {
          isUnsynced: false, isCompressed: false, isExtended: false, isExperimental: false, isFooter: true
        }
      });
    }
  }

  // --- Check for LYRICS3 tag ---
  if ( (options.types & TAGTYPE.LYRICS3V1 || options.types & TAGTYPE.LYRICS3V2) && fileSize > Math.max(143, options.minSize) ) {
    const lyricsId = Buffer.alloc(15);
    fs.readSync(fd, lyricsId, 0, 15, fileSize - 143);

    const id = lyricsId.toString();

    // LYRICS3 V1
    if ( id.substr(6) === 'LYRICSEND' ) {
      console.log('LYRICS3 v1 not yet supported!');
    }
    // LYRICS3 V2
    else if ( id.substr(6) === 'LYRICS200' ) {
      const lSize = parseInt(id.substr(0, 6), 10);
      const lyricsBuffer = Buffer.allocUnsafe(lSize);
      fs.readSync(fd, lyricsBuffer, 0, lSize, fileSize - (lSize + 143));
      const lyrics = lyricsBuffer.toString('Latin1');
      const fields = [];
      const flags = {};

      if ( lyrics.substr(0, 11) === 'LYRICSBEGIN' ) {
        let pos = 11;
        let offset;

        while( pos < lSize ) {
          const field = lyrics.substr(pos, 3);
          const size = parseInt(lyrics.substr(pos + 3, 5), 10);
          pos += 8;
          offset = pos;
          const content = lyrics.substr(pos, size);
          pos += size;

          if ( field === 'IND' ) {
            flags.hasLyrics = content[ 0 ] === '1';
            flags.hasTimestamps = content[ 1 ] === '1';
            flags.inhibitsRnd = content[ 2 ] === '1';
          }

          if ( field === 'INF' ) {
            fields.push({ id: field, name: LYRICSNAME[ field ], offset, size, content: content.split('\r\n') });
          }
          else if ( field === 'LYR' ) {
            const lines = content.split('\r\n');
            const lyrics = [];
            lines.forEach(line => {
              const parts = line.split(']');
              if ( parts.length === 1 && parts[ 0 ].trim().length ) {
                lyrics.push({ section: parts[ 0 ] })
              }
              else if ( parts.length > 1 ) {
                for(let i = 0; i < parts.length - 1; i++) lyrics.push({ time: _lyricTime(parts[ i ] + ']'), text: parts[ parts.length - 1 ] });
              }
            });

            fields.push({ id: field, name: LYRICSNAME[ field ], offset, size, content: lyrics });
          }
          else if ( field === 'IMG' ) {
            const obj = content.split('\r\n').map(line => {
              const lines = line.split('||');
              return {
                filename : lines[ 0 ],
                title    : lines[ 1 ],
                timestamp: _lyricTime(lines[ 2 ])
              }
            });
            fields.push({ id: field, name: LYRICSNAME[ field ], offset, size, content: obj });
          }
          else
            fields.push({ id: field, name: LYRICSNAME[ field ], offset, size, content });
        }

        tags.push({
          type      : 'LYRICS3',
          version   : 2.0,
          versionRaw: 0x0302,
          filepos   : fileSize - (lSize + 143), // 143 = TAG (128) + LYRICS3 footer and size (15, 6 (size) + 9)
          size      : lSize,
          tag       : lyricsBuffer,
          //          size      : lSize + 15,               // LYRICS tag size incl. footer todo: not so sure about this one...
          //          tag       : Buffer.concat([ lyricsBuffer, lyricsId ]),  // todo or this (lyrId)...
          frames    : fields,
          flags     : flags
        });
      }
    }
  }

  // --- Check for APE tag ---
  if ( options.types & TAGTYPE.APEV1 || options.types & TAGTYPE.APEV2 ) {

  }

  fs.closeSync(fd);

  const result = {
    filename    : filename,
    filenameFull: Path.resolve(filename),
    tags        : tags.map(jTag => Object.assign(jTag, parseTag(jTag))),
    summary     : {
      tagTypes       : [],
      images         : [],
      userDefinedText: [],
      userDefinedURL : []
    },
    errors
  };

  // create summary
  result.tags.forEach(tag => {
    const summary = result.summary;
    summary.tagTypes.push(`${ tag.type } (${ tag.version.toFixed(1) })`);

    tag.frames.forEach(frame => {
      if ( frame.name && frame.content ) {
        if ( frame.id === 'TXXX' ) {
          summary.userDefinedText.push(frame.content);
        }
        else if ( frame.id === 'WXXX' ) {
          summary.userDefinedURL.push(frame.content);
        }
        else if ( frame.id === 'APIC' ) {
          summary.images.push(frame.content);
        }
        else if ( typeof result[ frame.name ] === 'undefined' ) summary[ frame.name ] = frame.content;
      }
    });
  });

  return result;
}

function _lyricTime(ts) {
  if ( ts.length === 7 && ts.startsWith('[') && ts.endsWith(']') && ts.substr(3, 1) === ':' ) {
    return ts.substr(1, 2) * 60 + +ts.substr(4, 2);
  }
  else return ts
}

function validateTag(tag) {

}

function syncTag23(tag) {
  let srcPos = 0;
  let dstPos = 0;
  let frame = false;
  for(let byte of tag) {
    // find 0xff, set found, check if next is 0x00, if, skip 1 dst pos
  }
  // if diff, null remaining buffer (padding)
}

function syncTag24(tag) {

}

function parseTag(jTag) {
  if ( jTag.type.startsWith('ID3') ) {
    const frames = getFramesList(jTag);
    const tag = jTag.tag;

    // Calc padding
    if ( frames.length ) jTag.padding = tag.length - (frames[ frames.length - 1 ].offset + frames[ frames.length - 1 ].size);

    // -- Parse ID3 V1 frames --
    if ( jTag.type === 'ID3V1' ) {
      frames.forEach(frame => {
        if ( frame.id === 'TCON' ) {
          frame.content = GENRES[ tag[ frame.offset ] ] || '';
        }
        else if ( frame.id === 'TRCK' ) {
          frame.content = tag[ frame.offset ].toString();
        }
        else {
          const str = tag.slice(frame.offset, frame.offset + frame.size).toString('utf8');  // was: latin1
          frame.content = str.split('\u0000')[ 0 ];
        }
      });
    }

    // -- Parse ID3 V2 frames --
    else {
      frames.forEach(frame => {
        if ( frame.id ) {
          if ( frame.id.startsWith('T') ) {
            frame.content = _getString(tag.slice(frame.offset, frame.offset + frame.size), jTag.versionRaw, frame.id === 'TXXX');
          }
          else if ( frame.id.startsWith('W') ) {
            frame.content = _getString(tag.slice(frame.offset, frame.offset + frame.size), jTag.versionRaw, frame.id === 'WXXX');
          }
          else if ( frame.id === 'APIC' ) {
            frame.content = _getImage(tag.slice(frame.offset, frame.offset + frame.size), jTag.versionRaw);
          }
          else {

          }
        }
      });
    }

    function _getString(buffer, version, asArray = false) {
      const enc = buffer[ 0 ];
      let str;

      if ( enc === 0 ) {  // Latin 1 (ISO-8859-1)
        str = buffer.slice(1, buffer.length).toString('Latin1');
      }
      else if ( enc === 1 ) { // BOM (0xFEFF = BE, 0xFFFE = LE)
        str = iconv.decode(buffer.slice(1, buffer.length), 'utf16');
      }
      else if ( enc === 2 /*&& version > 0x0300 */ ) { // always BE, wo BOM
        str = iconv.decode(buffer.slice(1, buffer.length), 'utf16be');
        //str = buffer.slice(1, buffer.length).toString('utf16le');
      }
      else if ( enc === 3 /*&& version > 0x0300 */ ) { // UTF-8
        str = buffer.slice(1, buffer.length).toString('utf8');
      }

      if ( !str ) str = ''; // todo find out why str is sometimes undefined

      function _str2obj(str) {
        const arr = str.split('\u0000').slice(0, 2);
        return {
          key  : arr[ 0 ],
          value: arr[ 1 ]
        };
      }

      return asArray ? _str2obj(str) : str.split('\u0000')[ 0 ];
    }

    function _nulString(buffer, enc) {
      const buff = Buffer.from(buffer);
      const step = enc === 0 || enc === 4 ? 1 : 2;
      const fn = step === 1 ? buff.readUInt8.bind(buff) : buff.readUInt16BE.bind(buff);
      for(let i = 0; i < buffer.length - (step - 1); i += step) {
        if ( !fn(i) ) return buffer.slice(0, i);
      }
      return buffer;
    }

    function _getImage(buffer, version) {
      let p = 0;

      // -- Get image from ID3 V22
      if ( version === TAGTYPE.ID3V22 ) {
        const enc = buffer[ p++ ];
        const imageType = buffer.slice(p, p + 3).toString('latin1');
        p += 3;
        const type = buffer[ p++ ];
        const descBuff = _nulString(buffer.slice(p, 65), enc);
        const desc = descBuff.toString(ENCTYPE[ enc ]);
        p += descBuff.length + (enc === 0 || enc === 4 ? 1 : 2);

        return {
          mime: imageType, type, typeDesc: PICTYPE[ type ], desc, data: buffer.slice(p, buffer.length)
        };

      }
      // -- Get image from ID3 V23/V24
      else {
        const enc = buffer[ p++ ];
        const mimeBuff = _nulString(buffer.slice(p, 20), enc);  // todo: seem as this is always Latin 1.. double-check!
        const mime = mimeBuff.toString(ENCTYPE[ enc ]);
        p += mimeBuff.length + (enc === 0 || enc === 4 ? 1 : 2);
        const type = buffer[ p++ ];
        const descBuff = _nulString(buffer.slice(p, 65), enc);
        const desc = descBuff.toString(ENCTYPE[ enc ]);
        p += descBuff.length + (enc === 0 || enc === 4 ? 1 : 2);
        //fs.writeFileSync('test.jpg', buffer.slice(p, buffer.length));

        return {
          mime, type, typeDesc: PICTYPE[ type ], desc, data: buffer.slice(p, buffer.length)
        };
      }
    }

    return { frames };
  }
  else return {};
}

/**
 * List all frames within a Tag with offset, type and size.
 * @param jTag - buffer holding the complete Tag
 */
function getFramesList(jTag) {
  const frames = [];

  // --- V1 TAGS ---
  if ( jTag.version < 2 ) {
    frames.push(
      { id: 'TIT2', name: FRAMENAME.TIT2, offset: 3, size: 30, flags: 0 },
      { id: 'TPE1', name: FRAMENAME.TPE1, offset: 33, size: 30, flags: 0 },
      { id: 'TALB', name: FRAMENAME.TALB, offset: 63, size: 30, flags: 0 },
      { id: 'TYER', name: FRAMENAME.TYER, offset: 93, size: 4, flags: 0 },
      { id: 'COMM', name: FRAMENAME.COMM, offset: 97, size: jTag.version === 1.0 ? 30 : 28, flags: 0 }
    );
    if ( jTag.versionRaw === 0x0101 ) frames.push({ id: 'TRCK', name: FRAMENAME.TRCK, offset: 126, size: 1, flags: 0 });
    frames.push({ id: 'TCON', name: FRAMENAME.TCON, offset: 127, size: 1, flags: 0 });
  }

  // --- V2 TAGS ---
  else {
    const validFrames = jTag.version < 2.3 ? FRAMESV22 : (jTag.version < 2.4 ? FRAMESV23 : FRAMESV24);
    const tag = jTag.tag;
    const idSize = validFrames[ 0 ].length;
    const headerSize = idSize === 3 ? 6 : 10;
    let pos = 10;
    let stop = false;

    while( pos < tag.length - 1 ) {
      let offset = pos;

      // get frame id
      let id = '';
      for(let p = pos, b; p < pos + idSize; p++) {
        b = tag.readUInt8(p);
        if ( b < 32 || b > 0x7e ) {
          stop = true;
          break;
        }
        id += String.fromCharCode(b);
      }

      if ( stop ) break;
      pos += idSize;

      // get size
      let size = 0;
      for(let p = pos; p < pos + idSize && pos < tag.length; p++) {
        size <<= 8;
        size |= tag.readUInt8(p);
      }
      pos += idSize;

      // read flags
      let flags = 0;
      if ( jTag.versionRaw > 0x0200 && pos < tag.length ) {
        flags = tag.readUInt16BE(pos);
        pos += 2;
      }

      if ( id.length ) {
        if ( validateFrameId(id, validFrames) ) {
          frames.push({ id, name: FRAMENAME[ id ], offset: offset + headerSize, size, flags });
        }
        else {
          frames.push({ 'unknown': id, name: 'unknown', offset: offset + headerSize, size, flags });
        }
        pos += size;
      }
    }

    function validateFrameId(id, frames) {
      const p = id.substr(0, 1);
      return (p === 'X' || p === 'Y' || p === 'Z') || frames.includes(id);
    }
  }

  return frames;
}

/**
 * Converts a JSON representation of a Tag into a binary Tag that can directly
 * be written to a file. The version is derived from the JSON `version` field.
 * @param json
 * @returns Buffer
 */
function makeFrame(json) {

}

function tagToBuffer(tagJson) {

}

/**
 * Write tags to MP3 file. Tags is an array of tags or a single tag that should
 * be embedded in the MP3 file that filename points to.
 * @param filename
 * @param tags
 * @param options
 */
function writeTag(filename, tags, options = {}) {
  options = Object.assign({
    safeWrite: true       // save to temp file first
  }, options);

}

function convertTag(tagJson, targetVersion = TAGTYPE.ID3V23) {

}

function optimizeTag(tag, options) {
  const fListening = [];
  const fDJ = [];

  options = Object.assign({
    optimize: OPTIMIZE.MINIMIZE,
    types   : TAGTYPE.ID3V23,
    frames  : []  // only used with custom optimize
  }, options);

  /*
    - convert strings to Latin1/ASCII if possible, remove empty frames etc.
    - option: for listening, remove urls, and any tags except title, artist, remix, album, year, genre
    - option: for DJ, +keep bpm, key, ISMC, label, volume, ..
    - option: minimize, only convert strings
   */

}

function removeTags(filename, options) {
  options = Object.assign({
    safeWrite: true
  }, options);

}

function getVersion2(n) {
  const v = VERSIONS[ n ];
  return v ? v : v / 256;
}

function decodeSize(n) {
  return n & 0x7f | (n & 0x7f00) >>> 1 | (n & 0x7f0000) >>> 2 | (n & 0x7f000000) >>> 3;
}

function encodeSize(n) {
  let v = n & 0x7f;
  n <<= 1;
  v |= (n & 0x7f00);
  n <<= 1;
  v |= (n & 0x7f0000);
  n <<= 1;
  v |= (n & 0x7f000000);
  return v;
}

module.exports = {
  TAGTYPE,
  getTags: getid3,
  parseTag,
  tagToBuffer,
  writeTag,
  convertTag,
  optimizeTag,
  removeTags
};

