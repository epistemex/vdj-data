/**************************************
 *
 *  Song object
 *
 *  Copyright (c) 2019-2020 Silverspex
 *
 *************************************/

'use strict';

const crypto = require('crypto');
const Path = require('path');
const fs = require('fs');

const utils = require('./utils');
const Tags = require('./vdj.tags');
const Infos = require('./vdj.infos');
const Scan = require('./vdj.scan');
const Poi = require('./vdj.poi');
const Color = require('./vdj.color');
const { cleaner } = require('./cleaner');

const services = {
  'va': 'iDJPool',
  'cb': 'Digitrax',
  'vj': 'VJPro'
};

/**
 * Instance of a Song with normalized property names (JavaScript camel-case)
 * and type casting.
 * @param {*} [json] - optional Infos JSON from XML branch. A string is handled as path and initialize with basic path/size info. If none an empty instance is created.
 * @param {number} [initFlags] only used to initialize flags when loading song from disk (to set video/karaoke flags etc.)
 * @constructor
 */
function Song(json = {}, initFlags) {
  if ( typeof json === 'string' ) return Song.fromFile(json);

  let _flags = 0;
  let _audioOnly = true;
  let _karaoke = false;
  let _video = false;
  let _netsearch = false;
  let _netservice = null;

  this.path = utils.toStr(json.FilePath);
  this.fileSize = utils.toInt(json.FileSize);

  this.tags = new Tags(json.Tags ? json.Tags : {});
  this.scan = new Scan(json.Scan ? json.Scan : {});
  this.infos = new Infos(json.Infos ? json.Infos : {});

  this.pois = [];
  if ( Array.isArray(json.Poi) ) {
    json.Poi.forEach(poi => this.pois.push(new Poi(poi)));
  }

  this.comment = utils.toStr(json.Comment);
  this.customMix = utils.toStr(json.CustomMix);
  this.link = json.Link ? utils.toStr(json.Link.Cover) : null;

  Object.defineProperties(this, {
    'audioOnly' : { enumerable: true, get: () => _audioOnly },
    'video'     : { enumerable: true, get: () => _video },
    'karaoke'   : { enumerable: true, get: () => _karaoke },
    'netsearch' : { enumerable: true, get: () => _netsearch },
    'netservice': { enumerable: true, get: () => _netservice },
    'flags'     : {
      enumerable: true,
      get       : () => _flags,
      set       : v => {
        _flags = v | 0;
        _karaoke = !!(_flags & Song.FLAG.karaoke);
        _video = !!(_flags & Song.FLAG.video);
        _netsearch = _flags & Song.FLAG.netsearch;
        _audioOnly = !_video && !_karaoke && !_netsearch;
        _netservice = _netsearch ? services[ this.path.substr(12, 2)
          .toLowerCase() ] || 'unknown' : null;
      }
    }
  });

  this.flags = typeof initFlags === 'number' ? initFlags : utils.toInt(json.Flag);
  this.hash = null;
}

/* -----------------------------------------------------------------------------
  PROTOTYPE
----------------------------------------------------------------------------- */

Song.prototype = {

  /**
   * Convert instance to JSON representation with database property names.
   * @returns {*}
   */
  toJSON: function() {
    const json = {
      Tags : this.tags.toJSON(),
      Infos: this.infos.toJSON(),
      Scan : this.scan.toJSON(),
      Poi  : []
    };

    // Song
    if ( this.path ) json.FilePath = utils.fromStr(this.path);
    if ( this.fileSize ) json.FileSize = this.fileSize.toString();
    if ( this.flags ) json.Flag = this.flags.toString();

    //POIs
    for(let poi of this.pois) json.Poi.push(poi.toJSON());

    // Global
    if ( this.comment ) json.Comment = this.comment;
    if ( this.customMix ) json.CustomMix = this.customMix;
    if ( this.link ) json.Link = { Cover: this.link };

    return json;
  },

  /**
   * Convert instance to XML representation.
   * @returns {string}
   */
  toXML: function() {
    const song = { FilePath: this.path, FileSize: this.fileSize, Flag: this.flags === 0 ? null : this.flags };
    const attr = utils.getAttrList(song);
    const xml = [
      ` <Song ${ utils.attrListToKVString(attr) }>`,
      this.tags.toXML(),
      this.infos.toXML()
    ];

    if ( this.comment ) xml.push(`  <Comment>${ utils.toEntities(this.comment) }</Comment>`);

    xml.push(this.scan.toXML());

    this.pois.forEach(poi => xml.push(poi.toXML()));

    if ( this.customMix ) xml.push(`  <CustomMix>${ utils.toEntities(this.customMix) }</CustomMix>`);
    if ( this.link ) xml.push(`  <Link Cover="${ utils.toEntities(this.link) }" />`);

    xml.push(' </Song>');

    return xml.filter(x => x.length).join('\r\n');
  },

  /**
   * Convert filename to tags for artist, title, remix and year.
   * Based on cleanName().
   */
  filenameToTag: function() {
    const c = this.cleanName({ format: '%artist %featuring %presents' });
    if ( c ) {
      if ( c.artists.length ) this.tags.artist = c.cleaned;
      if ( c.title ) this.tags.title = c.title;
      if ( c.remix ) this.tags.remix = c.remix;
      if ( c.year ) this.tags.year = c.year;
    }
    return !!c
  },

  tagsToFilename: function(options) {

  },

  /**
   * Advanced filename cleaner using file basename in an attempt to restructure
   * and clean up parts of the name (artist(s), title, featuring, presents, remix,
   * year etc.)
   *
   * @param {*} [compilerOptions] - see src/cleaner for details
   * @returns {*}
   */
  cleanName: function(compilerOptions = {}) {
    return cleaner(Path.parse(this.path).name, compilerOptions);
  },

  /**
   * Produces a string based on given formatting. The default formatting is:
   *
   *     %artist - %title (%remix)
   *
   * The information is extracted from the tags stored in the database. If a tag
   * is empty an empty string is returned.
   *
   * Note that the keywords are case-sensitive.
   *
   * Keywords that can be used:
   *
   *     %artist
   *     %title
   *     %remix
   *     %year
   *     %album
   *     %label
   *     %genre
   *     %trackNumber
   *     %composer
   *     %bpm
   *     %key
   *     %grouping
   *     %stars
   *     %user1
   *     %user2
   *
   * @param {string} [format="%artist - %title (%remix)"] - formatting string
   * @returns {string}
   */
  toString: function(format = '%artist - %title (%remix)') {
    const regexp = /%artist|%title|%remix|%year|%album|%label|%trackNumber|%genre|%composer|%bpm|%key|%grouping|%stars|%user1|%user2/g;
    let tmp;

    if ( !this.tags.artist || !this.tags.title ) {
      tmp = JSON.stringify(this.tags);
      if ( !this.filenameToTag() ) tmp = null;
    }

    const result = format
      .replace(regexp, kw => this.tags[ kw.substr(1) ] || '')
      .replace(/\(\)|\s-\s?$/g, '')
      .trim();

    if ( tmp ) this.tags = JSON.parse(tmp);

    return result
  },

  /**
   * Verifies the file path.
   * @returns {boolean}
   */
  verifyPath: function() {
    return fs.existsSync(this.path);
  },

  /**
   * Renames the file name/path and also updates this Song instance.
   * @param newName
   * @private for now...
   */
  rename: function(newName) {

  },

  /**
   * Sort POIs by time position.
   */
  sortPOIs: function() {
    this.pois.sort((a, b) => {
      return utils.eq(a.pos, b.pos) ? 0 : (a.pos < b.pos ? -1 : 1)
    })
  },

  /**
   * Get tags from referenced file path in this instance.
   *
   * The Promise returns a JSON object with all available tags,
   * or null if unsuccessful (no tags or no file).
   * @returns {Promise<*|null>}
   */
  getFileTags: function() {
    return utils.getFileTags(this.path)
  },

  getSeratoTags: function() {
    // only support for MP3 files for now
    if ( this.path && this.path.toLowerCase().endsWith('.mp3') ) {
      const td = new TextDecoder('utf-8');
      const { getTags } = require('./getid3');
      const hdr = getTags(this.path);

      if ( hdr && hdr.tags ) {
        const st = [];
        hdr.tags.forEach(tag => { // ID3v2.x etc.
          tag.frames.forEach(frame => {
            if ( frame.id === 'GEOB' || (frame.id === 'TXXX' && frame.content.key === 'SERATO_PLAYCOUNT') ) {
              if ( frame.id !== 'TXXX' ) frame.buffer = new Uint8Array(tag.tag);
              st.push(frame);
            }
          })
        });

        /*
          {
            id: 'TXXX',
            name: 'userDefinedText',
            offset: 242,
            size: 20,
            flags: 0,
            content: { key: 'SERATO_PLAYCOUNT', value: '1' },
            buffer: Uint8Array [
               73,  68,  51,   3,   0,   0,   0,   2,  63, 120,  84,  73,
               84,  50,   0,   0,   0,  16,   0,   0,   0,  87, 114, 111,
              110, 103,  32,  68, 105, 114, 101,  99, 116, 105, 111, 110,
              ... 40862 more items
            ]
          },
          {
            type: 'application/octet-stream',
            description: 'Serato Overview',
            data: Uint8Array [
               1,  5,  1,  1,  1,  1,  1,  1, 42, 79, 42, 42,
               1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1,
              42, 42, 85, 42,  1,  1,  1,  1,  1,  1,  1,  1,
               1,  1,  1,  1, 36, 79, 78, 42,  1,  1,  1,  1,
              ... 3742 more items
            ]
          },
          {
            type: 'application/octet-stream',
            description: 'Serato Analysis',
            data: Uint8Array [ 2, 1 ]
          },
          {
            type: 'application/octet-stream',
            description: 'Serato Autotags',
            data: Uint8Array [
               1,  1, 48, 46, 48, 48, 0,
              45, 48, 46, 48, 56, 57, 0,
              48, 46, 48, 48, 48,  0
            ]
          },
          {
            type: 'application/octet-stream',
            description: 'Serato Markers_',
            data: Uint8Array [
                2,   5,   0,   0,   0,  14,   0,   0,   0,  47, 103, 127,
              127, 127, 127, 127,   0, 127, 127, 127, 127, 127,   6,  48,
                0,   0,   1,   0,   0,   0,  12,   8, 113, 127, 127, 127,
              ... 218 more items
            ]
          },
          {
            type: 'application/octet-stream',
            description: 'Serato Markers2',
            data: Uint8Array [
                1,   1, 65, 81,  70,  68, 84,  48, 120,  80, 85, 103,
               65,  65, 65, 65,  65,  69, 65,  80,  47,  47, 47,  48,
               78,  86, 82, 81,  65,  65, 65,  65,  65,  78, 65,  65,
               65,  65, 65, 66, 102, 110, 65,  77, 119,  65, 65,  65,
              ... 370 more items
            ]
          },
          {
            type: 'application/octet-stream',
            description: 'Serato BeatGrid',
            data: Uint8Array [
              1, 0, 0, 0,
              0, 0, 0
            ]
          },
          {
            type: 'application/octet-stream',
            description: 'Serato Offsets_',
            data: Uint8Array [
                1,  2, 48, 48, 48, 48, 48, 48, 51, 50, 48, 48,
               48, 48, 46, 48, 48, 48, 48, 48, 48,  0, 48, 48,
               48, 48, 48, 48, 48, 52, 52, 49, 48, 48, 46, 48,
              ... 19023 more items
            ]
          }
         */
        const tags = [];
        st
          .map(frame => frame.id === 'TXXX' ? frame : _decodeFrame(frame.buffer.subarray(frame.offset, frame.offset + frame.size)))
          .forEach(frame => {

            if ( frame.description === 'Serato Analysis' ) {
              tags.push({
                type   : 'version',
                version: +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`)
              })
            }

            else if ( frame.description === 'Serato Autotags' ) {
              const auto = td.decode(frame.data.subarray(2)).split('\0');
              tags.push({
                type    : 'autotags',
                version : +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`),
                bpm     : +auto[ 0 ],
                autoGain: +auto[ 1 ],
                db      : +auto[ 2 ]
              })
            }

            else if ( frame.description === 'Serato Markers2' ) {
              // convert binary base64 to string (! ..)
              let base64 = Buffer.from(frame.data.buffer, frame.data.byteOffset + 2, frame.data.byteLength - 2)
                .toString();
              if ( base64.length % 4 !== 0 ) base64 += 'A'.padEnd((base64.length % 4) - 1, '='); // invalid length, pad if needed

              // Now, convert back to binary format
              const bin = Buffer.from(base64, 'base64');
              const data = new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
              const view = new DataView(data.buffer, bin.byteOffset, bin.byteLength);
              const cuepoints = [];
              let pos = 2;

              while( pos < data.length - 1 ) {
                const term = data.indexOf(0, pos);
                if ( term < 0 || term >= data.length ) break;

                const name = td.decode(data.subarray(pos, term));
                pos = term + 1;
                const len = view.getUint32(pos);
                pos += 4;

                //console.log(name, len);
                if ( name === 'COLOR' ) {
                  cuepoints.push({ type: 'color', color: new Color(view.getUint32(pos)) })
                }
                else if ( name === 'BPMLOCK' ) {
                  cuepoints.push({ type: 'bpmlock', lock: !!data[ pos ] })
                }
                else if ( name === 'CUE' ) {
                  const index = view.getUint16(pos);
                  const position = view.getUint32(pos + 2) / 1000;
                  const color = new Color(view.getUint32(pos + 6));
                  const label = td.decode(data.subarray(pos + 12, pos + len - 1));
                  cuepoints.push({ type: 'cue', index, position, color, label })
                }
                else if ( name === 'LOOP' ) {

                }
                else if ( name === 'FLIP' ) {

                }
                pos += len;

              }

              //console.log(cuepoints);
              tags.push({
                type   : 'markers2',
                version: +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`),
                cuepoints
              })
            }

            else if ( frame.description === 'Serato Overview' ) {
              tags.push({
                type    : 'waveform',
                version : +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`),
                waveform: [ ...frame.data.subarray(2) ] //.map(i => i << 3)
              })
            }

            else if ( frame.description === 'Serato BeatGrid' ) {
              const view = new DataView(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength);
              const markers = [];
              let pos = 2;
              const count = view.getUint32(pos, true);
              pos += 4;
              for(let i = 0; i < count; i++) {
                if ( i === count - 1 ) {  // end marker
                  const position = view.getFloat32(pos, true);  // todo check endianess
                  pos += 4;
                  const bpm = view.getFloat32(pos, true);
                  pos += 4;
                  markers.push({ position, bpm, count: -1 })
                }
                else {
                  const position = view.getFloat32(pos, true);
                  pos += 4;
                  const beats = view.getUint32(pos, true);
                  pos += 4;
                  markers.push({ position, bpm: -1, beats })
                }
              }

              tags.push({
                type   : 'beatgrid',
                version: +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`),
                markers
              })
            }
          });

        // ... todo WIP

        return tags;

        function _decodeFrame(buffer) {
          let encoding;
          let type;
          let description;
          let data;
          let pos = 0;

          // content type
          encoding = buffer[ pos++ ];
          if ( encoding === 0 ) type = _extract();

          // description
          encoding = buffer[ pos++ ];
          if ( encoding === 0 ) description = _extract();

          if ( type === 'application/octet-stream' ) data = buffer.subarray(pos);

          function _extract() {
            let data = '';
            for(; pos < buffer.length; pos++) {
              const ch = buffer[ pos ];
              if ( ch === 0 ) break;
              data += String.fromCharCode(buffer[ pos ])
            }
            pos++;  // skip null term.
            return data
          }

          return { type, description, data }
        }
      }
    }
    return null
  },

  setSeratoTags: function(newPath) {

  },

  /**
   * Calc a MD5 hash for the media file referenced in this instance.
   * The hash is also stored as a property (`instance.hash`).
   *
   * Note that if max is set and the file size is larger, the file
   * is ignored completely rather than loading just a part.
   *
   * @param {number} [max=-1] max filesize in bytes, default = any size (-1)
   * @returns {string|null} hash string, or null if any error occurred.
   */
  calcMD5Hash: function(max = -1) {
    this.hash = null;
    max = max >>> 0;

    if ( max && this.verifyPath() && fs.statSync(this.path).size < max ) {
      try {
        const file = utils.loadFile(this.path);
        if ( file ) {
          this.hash = crypto
            .createHash('md5')
            .update(file)
            .digest('hex');
        }
      }
      catch(err) {
        debug(err);
      }
    }

    return this.hash
  }

};

/* -----------------------------------------------------------------------------
  ENUMS
----------------------------------------------------------------------------- */

// These are valid with database v8.4 and possible since v8. No guarantee for
// future versions since these are unofficial and undocumented.
Song.FLAG = { // todo WIP
  hidden   : 1 << 0,  // hidden from search
  notfound : 1 << 4,  // path/file not found (when showing up in results/lists i.e. strike icon)
  karaoke  : 1 << 5,
  video    : 1 << 6,
  netsearch: 1 << 8 // still need to confirm but looks very likely based on type grouping
  //netsearch: 1 << 11, // ?? also set on netsearch in main db (result status?)
  //oldSample: 1 << 17, // < v8.3 correlates with old vdjsamples, but also some wav files....
};

/* -----------------------------------------------------------------------------
  STATICS
----------------------------------------------------------------------------- */

Song.fromFile = function(path, flags) {
  try {
    const stat = fs.statSync(path);
    const song = new Song(undefined, flags);
    song.path = path;
    song.fileSize = stat.size;
    return song;
  }
  catch(err) {
    debug(err);
  }
  return null;
};

Song.Tags = Tags;
Song.Scan = Scan;
Song.Infos = Infos;
Song.Poi = Poi;

module.exports = Song;
