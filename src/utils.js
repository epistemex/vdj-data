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

/*
  from AcoustID: fingerprint matcher settings
  https://bitbucket.org/acoustid/acoustid-server/src/efb787c16ea1a0f6daf38611d12c85376d971b08/postgresql/?at=master
*/
const ACOUSTID_MAX_BIT_ERROR = 2;
const ACOUSTID_MAX_ALIGN_OFFSET = 120;

const MATCH_BITS = 14;
const MATCH_MASK = ((1 << MATCH_BITS) - 1);
const MATCH_STRIP = x => x >>> (32 - MATCH_BITS);

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
 * could assume > 0.9 is a match and below is not, but there are no absolutes here. The
 * score represents likeliness of match only.
 *
 * @param {*} fp1 - fingerprint 1 (raw version)
 * @param {*} fp2 - fingerprint 2 (raw version)
 * @returns {number} score between 0.0 and 1.0 where higher is more likely a match
 */
function compareFingerprints(fp1, fp2) {
  // Based on: https://bitbucket.org/acoustid/acoustid-server/src/efb787c16ea1a0f6daf38611d12c85376d971b08/postgresql/acoustid_compare.c?at=master#cl-87
  // MIT license - Copyright (C) 2010-2016 Lukas Lalinsky
  const a = fp1.fingerprint;
  const b = fp2.fingerprint;

  let numCounts = a.length + b.length + 1;
  let counts = new Uint16Array(numCounts << 1);
  let i, j, topCount;

  for(i = 0; i < a.length; i++) {
    const jBegin = Math.max(0, i - ACOUSTID_MAX_ALIGN_OFFSET);
    const jEnd = Math.min(b.length, i + ACOUSTID_MAX_ALIGN_OFFSET);
    for(j = jBegin; j < jEnd; j++) {
      let bitError = bitCount(a[ i ] ^ b[ j ]);
      if ( bitError <= ACOUSTID_MAX_BIT_ERROR ) {
        let offset = i - j + b.length;
        counts[ offset ]++;
      }
    }
  }

  topCount = 0;
  for(i = 0; i < numCounts; i++) {
    if ( counts[ i ] > topCount ) topCount = counts[ i ];
  }

  return topCount / Math.min(a.length, b.length);
}

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
  // Based on: https://bitbucket.org/acoustid/acoustid-server/src/efb787c16ea1a0f6daf38611d12c85376d971b08/postgresql/acoustid_compare.c?at=master#cl-119
  // MIT license - Copyright (C) 2010-2016 Lukas Lalinsky
  let a = fp1.fingerprint;
  let b = fp2.fingerprint;
  //  let a = _a.subarray(0);
  //  let b = _b.subarray(0);
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
    //b = _b.subarray(-topOffset);
    b = b.subarray(-topOffset);
    bSize = Math.max(0, bSize + topOffset);
  }
  else {
    //a = _a.subarray(topOffset);
    a = a.subarray(topOffset);
    aSize = Math.max(0, aSize - topOffset);
  }

  size = Math.min(aSize, bSize) * 0.5;
  if ( !size || !minSize ) {
    return 0.0
  }

  seen[ 0 ] = MATCH_MASK;
  for(i = 0; i < aSize; i++) {
    let key = MATCH_STRIP(a[ i ]);
    if ( !seen[ key ] ) {
      aUniq++;
      seen[ key ] = 1;
    }
  }

  seen[ 0 ] = MATCH_MASK;
  for(i = 0; i < bSize; i++) {
    let key = MATCH_STRIP(b[ i ]);
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
    bitError += bitCount(a[ i ] ^ b[ i ]);
  }

  score = (size * 2.0 / minSize) * (1.0 - 2.0 * bitError / (32 * size));
  if ( score < 0.0 ) score = 0.0;

  if ( diversity < 1.0 ) {
    score = Math.pow(score, 8.0 - 7.0 * diversity);
  }

  return score;
}

function bitCount(n) {
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return ((n + (n >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
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