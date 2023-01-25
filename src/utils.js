/**************************************
 *
 *  Utilities
 *
 *  Copyright (c) 2019-2020 Epistemex
 *
 *************************************/

'use strict';

const fs = require('fs');
const Path = require('path');

const videoExt = [ '.mp4', '.m4v', '.mov', '.mpg', '.mkv', '.ogv', '.wmv', '.webm' ];
//const audioExt = [ '.mp3', '.wav', '.flac', '.aac', '.ogg', '.aif', '.aiff', '.m4a', '.wma' ];
const karaokeExt = [ '.kfn', '.kok', '.txk', '.kar' ]; // .cdg is checked separately

// filtering for jIndex
const tbli = 'àáâãäåæçèéêëíîïðñòóôõöøúûüýāăąćĉčďēęěĝğĥīİıĵńňōőœřśŝşšţťūŭůűŵŷźżžșț¡¿';
const tblo = 'aaaaaaaceeeeiiionoooooouuuyaaacccdeeegghiiijnnooerssssttuuuuwyzzzst!?';

const entityTable = { '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;', '\'': '&apos;' };
const entityTableFrom = { 'amp': '&', 'quot': '"', 'lt': '<', 'gt': '>', 'apos': '\'' };

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

function toBPM(o) {return isDef(o) ? 60 / toFloat(o) : null;}

function fromBPM(bpm) {return 60 / bpm}

/**
 * Compare floating point numbers to be the same using epsilon margin.
 * @param {number} a - first number to compare
 * @param {number} b - second number to compare
 */
function eq(a, b) {
  return Math.abs(a - b) < 1e-6; // resolution set for XML/fractions
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
          let lPath = path.toLowerCase();
          for(let song of cdb.songs) {
            if ( song.filePath.toLowerCase() === lPath ) {
              songs.push(song);
              break
            }
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
  const mm = require('music-metadata');
  let meta = null;
  let rs;

  try {
    rs = fs.createReadStream(path);
    meta = await mm.parseStream(rs);
  }
  catch(err) {debug(err)}
  if ( rs ) rs.close();
  return meta
}

function loadFile(path, options) {
  try {
    return fs.readFileSync(path, options);
  }
  catch(err) {
    debug(err);
    return null
  }
}

function saveFile(path, data, options) {
  try {
    fs.writeFileSync(path, data, options);
    return true
  }
  catch(err) {
    debug(err);
    return false
  }
}

function loadFilePart(path, start, end) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = fs.createReadStream(path, { start, end, highWaterMark: 8192 });
    stream.on('data', chunks.push.bind(chunks));
    stream.on('error', reject);
    stream.on('end', () => {
      if ( chunks.length === 1 ) resolve(chunks[ 0 ]);
      else {
        resolve(Buffer.concat(chunks, end - start))
      }
    });
  })
}

function getMediaTypes(path) {
  const parts = Path.parse(path);
  const ext = parts.ext.toLowerCase();
  const karaoke = karaokeExt.includes(ext) || fs.existsSync(Path.join(parts.dir, parts.name + '.cdg'));
  //const karaoke = karaokeExt.includes(ext) || ([ '.mp3', '.wav', '.ogg', '.wma' ].includes(ext) && fs.existsSync(Path.join(parts.dir, parts.name + '.cdg')));
  return {
    karaoke,
    video: videoExt.includes(ext) || karaoke,
    audio: true
  };
}

// Jaccard

function toBigrams(txt, preFilter = false) {
  if ( preFilter ) {
    const rx = new RegExp(`[${ tbli }]`, 'gi');
    txt = txt.replace(rx, c => tblo[ tbli.indexOf(c) ]).replace(/[^a-zA-z0-9]/gi, ' ')
      .toLowerCase();
  }

  if ( txt.length < 2 ) return [ txt ];

  const bigrams = new Set();
  for(let i = 0; i < txt.length - 1; i++) {
    bigrams.add(txt.substr(i, 2))
  }

  return [ ...bigrams ].sort();
}

function jIndex(a, b) {
  const ul = union(a, b).length;
  return ul ? intersection(a, b).length / ul : 0;
}

function intersection(a, b) {
  return a.filter(e => ~b.indexOf(e));
}

function union(a, b) {
  return [ ...(new Set(a.concat(b))) ];
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
  loadFile,
  loadFilePart,
  saveFile,
  getMediaTypes,
  toBigrams,
  jIndex
};