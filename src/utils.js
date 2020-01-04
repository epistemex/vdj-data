/**************************************
 *
 *  Utilities
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const fs = require('fs');
const Path = require('path');
//const he = require('he');

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
  //return he.encode(kw, {useNamedReferences: true})
  return kw.replace(entityRX, w => entityTable[ w ]);
}

function fromEntities(kw) {
  //  if (typeof kw === 'string') {
  //    let start = 0;
  //    let amp = kw.indexOf('&');
  //    if (amp < 0) return kw;
  //
  //    let str = [kw.substring(0, amp)];
  //
  //    while(amp >= 0) {
  //      const semi = kw.indexOf(';', start + 1);
  //      if (semi < 0 || semi > 4) {
  //        str.push(kw.substr(amp));
  //        start = kw.length;
  //      }
  //      else {
  //        const ent = kw.substring(amp + 1, semi);
  //        const char = entityTableFrom[ent];
  //        if (char) {
  //          str.push(char);
  //          start = semi + 1;
  //        }
  //        else {
  //          start = semi + 1;
  //          str.push('&', kw.substring(start, amp + 1));
  //        }
  //      }
  //      amp = kw.indexOf('&', start);
  //      if (amp < 0) str.push(kw.substr(start));
  //      else str.push(kw.substring(start, amp))
  //    }
  //    return str.join('')
  //  }
  //  else return null;
  //return he.decode(kw, {useNamedReferences: true})
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

function toColor(o) {
  if ( isDef(o) ) {
    const argb = o >>> 0;
    return {
      a: argb >>> 24,
      r: argb >>> 16 & 0xff,
      g: argb >>> 8 & 0xff,
      b: argb & 0xff
    };
  }
  else return null;
}

function fromColor(o) {return (o.a << 24 | o.r << 16 | o.g << 8 | o.b) >>> 0;}

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
  toColor,
  fromColor,
  eq,
  lookupPaths,
  getRoot,
  getAttrList,
  attrListToKVString,
  fnEncoder,
  readDirectory,
  readDirectoryRecursive,
  camelCase
};