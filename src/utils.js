/**************************************
 *
 *  Utilities
 *
 *  Copyright (c) 2019-2020 Silverspex
 *
 *************************************/

'use strict';

const fs = require('fs');
const Path = require('path');
const sys = process.platform === 'win32' ? require('./sys32') : require('./sysOSX');

const { popcntTable8, popcntTable16 } = require('./acoustid');

/*
  from AcoustID: fingerprint matcher settings
  https://bitbucket.org/acoustid/acoustid-server/src/efb787c16ea1a0f6daf38611d12c85376d971b08/postgresql/?at=master
*/
const ACOUSTID_MAX_BIT_ERROR = 2;
const ACOUSTID_MAX_ALIGN_OFFSET = 120;
const ACOUSTID_QUERY_START = 80;
const ACOUSTID_QUERY_LENGTH = 120;
const ACOUSTID_QUERY_BITS = 28;
const ACOUSTID_QUERY_MASK = (((1 << ACOUSTID_QUERY_BITS) - 1) << (32 - ACOUSTID_QUERY_BITS));
const ACOUSTID_QUERY_STRIP = x => x & ACOUSTID_QUERY_MASK;

const MATCH_BITS = 14;
const MATCH_MASK = ((1 << MATCH_BITS) - 1);
const MATCH_STRIP = x => x >> (32 - MATCH_BITS);

const UNIQ_BITS = 16;
const UNIQ_MASK = ((1 << MATCH_BITS) - 1);
const UNIQ_STRIP = x => x >> (32 - MATCH_BITS); // todo same as MATCH_STRIP..

function popCount8(i) {
  return popcntTable8[ (i >>> 0) & 0xff ] + popcntTable8[ (i >>> 8) & 0xff ] + popcntTable8[ (i >>> 16) & 0xff ] + popcntTable8[ (i >>> 24) & 0xff ]
}

function popCount16(i) {
  return popcntTable16[ i & 0xffff ] + popcntTable16[ i >> 16 ];
}

const entityTable = {
  '&' : '&amp;',
  '"' : '&quot;',
  '<' : '&lt;',
  '>' : '&gt;',
  '\'': '&apos;'
};

const entityTableFrom = {
  'amp' : '&',
  'quot': '"',
  'lt'  : '<',
  'gt'  : '>',
  'apos': '\''
};

const entityRX = new RegExp(`[${ Object.keys(entityTable).join('') }]`, 'g');
const entityRXFrom = new RegExp(`&(${ Object.keys(entityTableFrom).join('|') });`, 'gi');

function toEntities(kw) {
  return kw.replace(entityRX, w => entityTable[ w ]);
}

function fromEntities(kw) {
  return kw ? kw.replace(entityRXFrom, (w, i) => entityTableFrom[ i ]) : null;
}

function fnEncoder(a) {
  if ( isNaN(a) ) return toEntities(a.toString());
  else {
    const f = parseFloat(a);
    if ( f === parseInt(a, 10) ) return a;
    else return f.toFixed(6);
  }
}

function isDef(o) {return typeof o !== 'undefined';}

function isNum(o) {return typeof o === 'number';}

function toInt(o) {return isDef(o) ? parseInt(o, 10) : null;}

function toFloat(o) {return isDef(o) ? parseFloat(o) : null;}

function toStr(o) {return isDef(o) ? o : null;} // is decoded in XML parser (optional)
function fromStr(o) {return typeof o === 'string' ? toEntities(o) : null;}

function toDate(o) {return isDef(o) ? new Date(parseInt(o, 10) * 1000) : null;}

function fromDate(d) {return Math.round(d.getTime() * 0.001);}

function toBool(o) {return isDef(o) ? o === '1' : null;}

function fromBool(b) {return b ? '1' : '0';}

function toBPM(o) {return isDef(o) ? 1 / toFloat(o) * 60 : null;}

function fromBPM(bpm) {return 1 / (bpm / 60);}

/**
 * Compare floating point numbers to be the same using epsilon margin.
 * @param {number} a - first number to compare
 * @param {number} b - second number to compare
 */
function eq(a, b) {
  return Math.abs(a - b) < 0.000000001
}

/**
 * Lookup list of paths in the database list.
 * Produces a list of Song objects for found items.
 *
 * @param {Array} paths - list of absolute paths to tracks
 * @param {Array} dbs - list of Database objects to query against.
 * @param {Boolean} [ignoreRoot=false] - ignore root drive check
 * @returns [] - List of Song objects
 */
function lookupPaths(paths, dbs, ignoreRoot = false) {
  const songs = [];

  if ( Array.isArray(dbs) && dbs.length ) {
    paths.forEach(path => {

      // get database to look up
      for(let db of dbs) {
        let cdb = null;

        // get a current database to query, or all if ignore root
        if ( ignoreRoot ) cdb = db;
        else {
          const rootDrive = getRoot(path);
          if ( db.rootDrive === rootDrive ) cdb = db;
        }

        // query current database
        if ( cdb ) {
          for(let song of cdb.songs) {
            let lPath = path.toLowerCase();
            if ( song.filePath.toLowerCase() === lPath ) songs.push(song);
          }
        }

      }
    });
  }

  return songs;
}

function getRoot(path) {
  const parsed = Path.parse(path);
  //todo verify the usefulness of this on Mac:
  return (parsed.root === '/' ? parsed.dir : parsed.root).toLowerCase();
}

function getAttrList(o) {
  const attr = [];
  for(let key of Object.keys(o)) {
    const value = o[ key ];
    if ( typeof value !== 'undefined' && value !== null ) attr.push({ key, value });
  }
  return attr;
}

function attrListToKVString(attr, fn = fnEncoder) {
  return attr.map(a => a.key + '="' + fn(a.value) + '"').join(' ');
}

/**
 * Read a single directory. Returns an object with `files` and `folder` arrays
 * containing the resolved path for each entry.
 * @param {string} path - path to base directory.
 * @returns {{folders: *, files: *}}
 * @throws If base path is not a directory the call will throw an exception.
 */
function readDirectory(path) {
  const files = [];
  const folders = [];

  path = Path.resolve(path);

  if ( fs.statSync(path).isDirectory() ) {
    fs.readdirSync(path).forEach(e => {
      const full = Path.join(path, e);
      try {
        const stat = fs.statSync(full);
        if ( stat.isFile() )
          files.push(full);
        else if ( stat.isDirectory() )
          folders.push(full);
      }
      catch(err) {
        debug(err);
      }
    });
  }
  else throw 'Need a directory as base path.';

  return { files, folders };
}

/**
 * Read a directory recursively. Returns an object with `files` and `folder` arrays
 * containing the resolved path for each entry and for each sub-folder.
 * @param {string} path - path to base directory.
 * @returns {{folders: *, files: *}}
 * @throws If base path is not a directory the call will throw an exception.
 */
function readDirectoryRecursive(path) {
  const result = readDirectory(path);
  const files = result.files;
  const folders = result.folders;
  //noinspection JSAssignmentUsedAsCondition
  for(let i = 0, folder; folder = folders[ i++ ];) {
    const result = readDirectory(folder);
    files.push(...result.files);
    folders.push(...result.folders);
  }
  return { files, folders };
}

function camelCase(s) {
  return s[ 0 ].toLowerCase() + s.substr(1);
}

/**
 * Extract a meta tag object from a supported media file.
 * If invalid path or unsupported type, a null is returned.
 * @param path
 * @returns {Promise<*|null>}
 */
async function getFileTags(path) {
  const mm = require('music-metadata-browser');
  let meta = null;
  let rs;

  try {
    rs = fs.createReadStream(path);
    meta = await mm.parseNodeStream(rs);
  }
  catch(err) {
    debug(err)
  }
  if ( rs ) rs.close();
  return meta
}

/**
 * Calculate a fingerprint for a given audio file. By default this produces
 * a base-64 encoded compressed version which you can use with AcoustID's own
 * web API services.
 *
 * You can however use the raw version to compare and find duplicates locally
 * using the raw flag.
 *
 * @param {string} path - path to supported media file to fingerprint
 * @param {boolean} [raw=false] - if true, output the raw uncompressed fingerprint as an array of 32-bit unsigned integers.
 * @returns {*}
 */
function getAudioFingerprint(path, raw = false) {
  return sys.getAudioFingerprint(path, raw)
}

/**
 * Compare and score two raw fingerprints. A score would be between 0.0 and 1.0; you
 * could say > 0.9 is a natch and below is not, but there are no absolutes here. The
 * score represents likeliness of match only.
 *
 * @param {*} fp1 - fingerprint 1 (raw version)
 * @param {*} fp2 - fingerprint 2 (raw version)
 * @returns {number} score between 0.0 and 1.0 where higher is more likely a match
 */
function compareFingerprints(fp1, fp2) {
  let offset = 0; // for alignment

  if ( Math.abs(fp1.duration - fp2.duration) > 0.5 ) { // 0.5 for now, use a better method in final
    // todo find offset
  }

  const len = Math.min(fp1.fingerprint.length, fp1.fingerprint.length) - offset;
  let score = 0.0;

  for(let i = offset; i < len; i++) {
    score += popCount8(fp1.fingerprint[ i ] ^ fp2.fingerprint[ i ]);
  }

  return 1 - (score / (len - offset) / 32);
}

/*
  Based on: https://bitbucket.org/acoustid/acoustid-server/src/efb787c16ea1a0f6daf38611d12c85376d971b08/postgresql/acoustid_compare.c?at=master#cl-119
 */
/**
 * Same as compareFingerprints() but with support for offset where offset can be
 * two similar tracks where one starts a bit later than the other or similar cases.
 * The max offset represents fingerprints indices.
 * @param {*} fp1 - fingerprint 1 (raw version)
 * @param {*} fp2 - fingerprint 2 (raw version)
 * @param {number} maxOffset - offset in number of indices of the raw fingerprint array
 * @returns {number} score between 0.0 and 1.0 where higher is more likely a match
 */
function compareFingerprintsOffset(fp1, fp2, maxOffset) {
  let a = new Uint32Array(fp1.fingerprint);
  let b = new Uint32Array(fp2.fingerprint);
  let aSize = a.length;
  let bSize = b.length;

  const numCounts = aSize + bSize + 1;
  const counts = new Uint16Array(numCounts);

  const aOffsets = new Uint16Array(MATCH_MASK << 1);
  const bOffsets = aOffsets.subarray(MATCH_MASK);
  const seen = new Uint8Array(aOffsets.buffer);

  let i, topCount, topOffset, size, bitError = 0, minSize, aUniq = 0, bUniq = 0;
  let score, diversity;

  for(i = 0; i < aSize; i++) aOffsets[ MATCH_STRIP(a[ i ]) ] = i;
  for(i = 0; i < bSize; i++) bOffsets[ MATCH_STRIP(b[ i ]) ] = i;

  topCount = 0;
  topOffset = 0;

  for(i = 0; i < MATCH_MASK; i++) {
    if ( aOffsets[ i ] && bOffsets[ i ] ) {
      let offset = aOffsets[ i ] - bOffsets[ i ];
      if ( maxOffset === 0 || (-maxOffset <= offset && offset <= maxOffset) ) {
        offset += bSize;
        counts[ offset ]++;
        if ( counts[ offset ] > topCount ) {
          topCount = counts[ offset ];
          topOffset = offset;
        }
      }
    }
  }

  topOffset -= bSize;

  minSize = Math.min(aSize, bSize) & ~1;
  if ( topOffset < 0 ) {
    b = b.subarray(-topOffset);
    bSize = Math.max(0, bSize + topOffset);
  }
  else {
    a = a.subarray(topOffset);
    aSize = Math.max(0, aSize - topOffset);
  }

  size = Math.min(aSize, bSize) * 0.5;
  if ( !size || !minSize ) {
    return 0.0
  }

  seen[ 0 ] = UNIQ_MASK;
  for(i = 0; i < aSize; i++) {
    let key = UNIQ_STRIP(a[ i ]);
    if ( !seen[ key ] ) {
      aUniq++;
      seen[ key ] = 1;
    }
  }

  seen[ 0 ] = UNIQ_MASK;
  for(i = 0; i < bSize; i++) {
    let key = UNIQ_STRIP(b[ i ]);
    if ( !seen[ key ] ) {
      bUniq++;
      seen[ key ] = 1;
    }
  }

  diversity = Math.min(Math.min(1.0, (aUniq + 10) / aSize + 0.5), Math.min(1.0, (bUniq + 10) / bSize + 0.5));

  if ( topCount < Math.max(aUniq, bUniq) * 0.02 ) {
    return 0.0
  }

  for(i = 0; i < size; i++) {
    bitError += popCount8(a[ i ] ^ b[ i ]);
  }

  score = (size * 2.0 / minSize) * (1.0 - 2.0 * bitError / (32 * size));
  if ( score < 0.0 ) score = 0.0;

  if ( diversity < 1.0 ) {
    score = Math.pow(score, 8.0 - 7.0 * diversity);
  }

  return score;
}

module.exports = {
  toEntities,
  fromEntities,
  isDef,
  isNum,
  toInt,
  toFloat,
  toStr,
  fromStr,
  toDate,
  fromDate,
  toBool,
  fromBool,
  toBPM,
  fromBPM,
  eq,
  lookupPaths,
  getRoot,
  getAttrList,
  attrListToKVString,
  fnEncoder,
  readDirectory,
  readDirectoryRecursive,
  camelCase,
  getFileTags,
  getAudioFingerprint,
  compareFingerprints,
  compareFingerprintsOffset
};