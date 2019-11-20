/**************************************
 *
 *  VDJ Data API
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

/** @module vdj-data */

/*
  This will wrap up the various sub-modules
  and provide a single clean entry point.
 */

//global.DEBUG = true;

global.debug = msg => {
  if ( global.DEBUG ) console.log(msg);
};

global.isWin = process.platform === 'win32';
global.isMac = process.platform === 'darwin';

const vdj = require('./src/vdj.js');

module.exports = {
  isRunning       : vdj.isRunning,
  getVDJFolders   : vdj.getVDJFolders,
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
  vdj
};
