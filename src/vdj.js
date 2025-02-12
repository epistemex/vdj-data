/**************************************
 *
 *  VDJ Top-Level & System functions
 *
 *  Copyright (c) 2019 Epistemex
 *
 *************************************/

'use strict';

const fs = require('fs');
const Path = require('path');

const sys = global.isWin ? require('./sys32') : require('./sysOSX');
const xml = require('./xml');
const utils = require('./utils');
const Playlist = require('./vdj.playlist');

let _settings;
let _rootFolder = null;
const _rp = sub => Path.resolve(_rootFolder, sub);
getVDJHome(); // inits _rootFolder

/**
 * Folder type enums. These are initialized with
 * the absolute path to the folder and can be used
 * directly.
 * @readonly
 * @enum {string}
 */
const FOLDER = {
  BACKUP             : _rp('Backup'),
  CACHE              : _rp('Cache'),
  CACHECOVERS        : _rp('Cache/Covers'),
  CACHEPLUGINS       : _rp('Cache/Plugins'),
  CLOUDLISTS         : _rp('Cloudlists'),
  DEVICES            : _rp('Devices'),
  FOLDERS            : _rp('Folders'),
  HISTORY            : _rp('History'),
  MAPPERS            : _rp('Mappers'),
  PADS               : _rp('Pads'),
  PLAYLISTS          : _rp('Playlists'),
  PLUGINS            : _rp('Plugins'),
  PLUGINSAUTOSTART   : _rp('Plugins/AutoStart'),
  PLUGINSSOUNDFX     : _rp('Plugins/SoundEffect'),
  PLUGINSVIDEOFX     : _rp('Plugins/VideoEffect'),
  PLUGINSVIDEOTRANS  : _rp('Plugins/VideoTransition'),
  PLUGINSVIZ         : _rp('Plugins/Visualisations'),
  PLUGINS64          : _rp('Plugins64'),
  PLUGINSAUTOSTART64 : _rp('Plugins64/AutoStart'),
  PLUGINSSOUNDFX64   : _rp('Plugins64/SoundEffect'),
  PLUGINSVIDEOFX64   : _rp('Plugins64/VideoEffect'),
  PLUGINSVIDEOTRANS64: _rp('Plugins64/VideoTransition'),
  PLUGINSVIZ64       : _rp('Plugins64/Visualisations'),
  PULSELOCKER        : _rp('pulselocker'),
  SAMPLER            : _rp('Sampler'),
  SKINS              : _rp('Skins'),
  TOOLS              : _rp('Tools'),
  VIDEOSKINS         : _rp('videoskins')
};

/**
 * File type enums These are initialized with
 * the absolute path to the file and can be used
 * directly.
 * @readonly
 * @enum {string}
 */
const FILE = {
  DATABASEFILE: _rp('database.xml'),
  SETTINGSFILE: _rp('settings.xml'),
  LICENSEFILE : _rp('license.dat')
};

/**
 * Check if VirtualDJ software is running. It's critical as to write operations
 * that it doesn't, so use this async call before invoking any update or write
 * operations to databases, playlists etc.
 * @returns {Promise<Boolean>} true if VirtualDJ is running
 * @async
 */
function isRunning() {
  const psList = require('ps-list');
  return new Promise((resolve, reject) => {
    psList()
      .then(list => {
        if ( list.filter(i => i.name.toLowerCase().startsWith('virtualdj')).length ) resolve(true);
        else resolve(false);
      })
      .catch(reject);
  });
}

/**
 * Returns list of objects with paths VirtualDJ is using to store data.
 * @returns {*}
 */
function getVDJFolders() {
  let result = { homeFolder: process.env.APPDATA + '/no-virtualdj-path-found' };
  if ( isWin ) {
    const regs = require('./sys32').getRegSync('HKCU\\Software\\VirtualDJ');
    regs.forEach(reg => result[ utils.camelCase(reg[ 0 ]) ] = reg[ 2 ]);
  }
  else if ( isMac ) {
    //const path1 = Path.join(process.env.HOME, 'Library', 'VirtualDJ'); todo verify that Library/ is still in use on Mac
    //const path2 = Path.join(process.env.HOME, 'Documents', 'VirtualDJ');
    result.homeFolder = Path.join(process.env.HOME, 'Documents', 'VirtualDJ'); //fs.existsSync(path1) ? path1 : (fs.existsSync(path2) ? path2 : null);
  }
  return result;
}

/**
 * Get VirtualDJ's home folder. The value is cached.
 * It's recommended you use this if you only need the home
 * folder.
 * @returns {string} - absolute path to VirtualDJ's home folder
 */
function getVDJHome() {
  if ( !_rootFolder ) _rootFolder = getVDJFolders().homeFolder;
  return _rootFolder
}

/**
 * Get non-ignored drive letters (Windows only for now).
 * See settings ignoreDrives for details.
 * @returns {Array}
 */
function getIgnoredDrives() {
  const settingsPath = Path.join(getVDJFolders().homeFolder, 'settings.xml');
  const settings = _settings ? _settings : fs.readFileSync(settingsPath, 'utf-8');
  const tag = '<ignoreDrives>';
  const tagClose = '</ignoreDrives>';
  let ignore = 0;

  //find setting
  const tagStart = settings.indexOf(tag);
  if ( tagStart > 0 ) {
    const tagEnd = settings.indexOf(tagClose, tagStart + tag.length);
    if ( tagEnd > 0 ) {
      ignore = settings.substring(tagStart + tag.length, tagEnd) | 0;
    }
  }

  if ( isWin ) {
    const allDrives = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let drives = '';
    for(let i = 0; i < allDrives.length; i++) {
      const bit = ignore & (1 << i);
      if ( bit ) drives += allDrives[ i ];
    }
    return drives.split('');
  }
  else {
    // todo OSX
    console.log('Sorry, this platform is currently not supported.');
    return [];
  }
}

/**
 * Loads a XML database file and parses it into objects (Song list).
 * @param {string} path - path to VirtualDJ (v8+) database.xml file, or XML as string.
 * @returns {null|Database} - if something went wrong, null is returned.
 */
function loadDatabase(path) {
  try {
    return xml.parseDatabaseXML(path);
  }
  catch(err) {
    debug(err);
  }

  return null;
}

/**
 * Loads all available databases from disk to a list of Database objects.
 * Note that due to databases may reside on removable drives, the result
 * may vary.
 * @param {Boolean} [all=false] - ignores ignoreDrives settings (only effective on Windows)
 * @returns [] - List of Database objects. Should always contain at least the main database
 * */
function loadAllDatabases(all = false) {
  if ( !isWin ) {
    console.log('Sorry, platform not currently supported.');
    return [];
  }

  const databases = [];
  const paths = getDrivePaths(all);

  paths.forEach(drivePath => {
    const db = loadDatabase(Path.join(drivePath, 'database.xml'));
    if ( db ) databases.push(db);
  });

  return databases;
}

/**
 * Parses a playlist into either Song objects (id database list is provided)
 * and paths list (property `paths`).
 *
 * When a list of Database objects is provided, the playlist can be parsed into
 * a Song list (property `songs').
 *
 * @param {string} path - path to playlist, history list
 * @param {Array} [databaseList] - optional array containing database objects.
 * @constructor
 */
function loadPlaylist(path, databaseList) {
  return new Playlist(path, databaseList);
}

/**
 * List system, removable and network drives where a VirtualDJ folder is located.
 * Respects ignoreDrives settings (can be overridden).
 *
 * If you only need a list of paths, see `getDrivesPaths()` instead.
 *
 * @param {Boolean} [listAll = false] - if true will ignore the ignoreDrives setting
 * and list all drives where a VirtualDJ folder is found in the root.
 * @param {Boolean} [includeHome = true] - since root can be obtained via vdjFolders()
 * this is optional. Set to false to ignore this drive (e.g. for backup()/restore() extra list).
 * @returns [] list of objects holding information about each VirtualDJ folder and drive
 */
function getDrives(listAll = false, includeHome = true) {
  if ( !isWin ) {
    console.log('Sorry, platform not supported at the moment.');
    return [];
  }

  const drives = [
    ...sys.listDrivesSync(sys.driveType.local),
    ...sys.listDrivesSync(sys.driveType.removable),
    ...sys.listDrivesSync(sys.driveType.network)
  ];

  const vdjHome = getVDJHome();
  const vdjRoot = utils.getRoot(vdjHome).toUpperCase();

  let mainFolder;

  // add default main folder
  if ( includeHome ) {
    const vdjRootShort = vdjRoot.substr(0, 2);
    for(let drive of drives) {
      if ( drive.DeviceID === vdjRootShort ) {
        mainFolder = {
          root  : vdjRoot.toUpperCase(),
          folder: vdjHome,
          size  : drive.Size,
          free  : drive.FreeSpace,
          type  : drive.Description,
          main  : true
        };
        break;
      }
    }
  }

  const ignore = listAll ? '' : getIgnoredDrives().join('').replace(vdjRoot[ 0 ], '');

  // filter against VirtualDJ directories and ignoreDrives
  const final = drives
    .filter(drive => !ignore.includes(drive.DeviceID[ 0 ]))
    .filter(drive => fs.existsSync(Path.join(drive.DeviceID, 'VirtualDJ', 'database.xml')))
    .map(drive => {
      return {
        root  : utils.getRoot(Path.join(drive.DeviceID, 'VirtualDJ')).toUpperCase(),
        folder: Path.join(drive.DeviceID, 'VirtualDJ'),
        size  : drive.Size,
        free  : drive.FreeSpace,
        type  : drive.Description,
        main  : false //fs.existsSync(Path.join(drive.DeviceID, 'VirtualDJ', 'Skins'))  // settings.xml may not exist until changed
      };
    });

  if ( mainFolder ) final.unshift(mainFolder);

  return final;
}

/**
 * List system, removable and network drives where a VirtualDJ folder is located.
 * Respects ignoreDrives settings (can be overridden).
 *
 * In contrast to `getDrives()` this call only lists the paths to each VirtualDJ folder.
 *
 * @param {Boolean} [listAll = false] - if true will ignore the ignoreDrives setting
 * and list all drives where a VirtualDJ folder is found in the root.
 * @param {Boolean} [includeHome = true] - since root can be obtained via vdjFolders()
 * this is optional. Set to false to ignore this drive (e.g. for backup()/restore() extra list).
 * @returns [] - list of strings holding path to each VirtualDJ folder
 */
function getDrivePaths(listAll = false, includeHome = true) {
  return getDrives(listAll, includeHome).map(drive => drive.folder);
}

// Mac/PC ... kept here for evaluation
function fromMacToPC() {
  // todo replace all paths (database, playlists etc.) and save to new folder
}

function fromPCToMac() {
  // todo replace all paths (database, playlists etc.) and save to new folder
}

module.exports = {
  isRunning,
  getVDJFolders,
  getVDJHome,
  getIgnoredDrives,
  loadDatabase,
  loadAllDatabases,
  loadPlaylist,
  getDrives,
  getDrivePaths,
  FOLDER,
  FILE
};
