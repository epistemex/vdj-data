/**************************************
 *
 *  VDJ Data API
 *
 *  Copyright (c) 2019-2020 Silverspex
 *
 *************************************/

'use strict';

/** @module vdj-data */

/*
  This will wrap up the various sub-modules
  and provide a single clean entry point.
 */

//global.DEBUG = true;

global.debug = function() {
  if ( global.DEBUG ) console.log(...arguments);
};

global.isWin = process.platform === 'win32';
global.isMac = process.platform === 'darwin';

const vdj = require('./src/vdj.js');

module.exports = {
  //vdj,
  isRunning       : vdj.isRunning,
  getVDJFolders   : vdj.getVDJFolders,
  getVDJHome      : vdj.getVDJHome,
  getDrives       : vdj.getDrives,
  getDrivePaths   : vdj.getDrivePaths,
  getIgnoredDrives: vdj.getIgnoredDrives,
  loadDatabase    : vdj.loadDatabase,
  loadAllDatabases: vdj.loadAllDatabases,
  loadPlaylist    : vdj.loadPlaylist,
  backup          : require('./src/vdj.backup'),
  restore         : require('./src/vdj.restore'),
  utils           : require('./src/utils'),
  Color           : require('./src/vdj.color'),
  Database        : require('./src/vdj.database'),
  Playlist        : require('./src/vdj.playlist'),
  Sample          : require('./src/vdj.sample'),
  audio           : require('./src/audio'),
  FOLDER          : vdj.FOLDER,
  FILE            : vdj.FILE
};
