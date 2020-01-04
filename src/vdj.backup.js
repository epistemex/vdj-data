/**************************************
 *
 *  Backup module
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const fs = require('fs');
const Path = require('path');

const vdj = require('./vdj');
const utils = require('./utils');
const Database = require('./vdj.database');

const info = require('../package.json');

/**
 * Backup entire VirtualDJ root folder (folder, history, mappers,
 * playlists, cloudlists, settings and databases).
 * @param {string} dstPath - where to save the backup zip file
 * @param {Array} [dbList] - array of additional paths to the database.xml files.
 * The main database.xml is automatically included.
 * @param {Array} [list=[ 'Folders', 'History', 'Mappers', 'Playlists', 'Cloudlists', 'settings.xml' ]] - folder and file list to backup.
 * Note that database.xml is handled separately.
 * @returns {Promise<boolean>} true if zip was created and saved successfully
 */
async function backup(dstPath, dbList = [], list = [ 'Folders', 'History', 'Mappers', 'Playlists', 'Cloudlists', 'settings.xml' ]) {
  const backupList = list.filter(e => e.toLowerCase() !== 'database.xml');
  const vdjPath = vdj.getVDJHome();
  if ( !vdjPath ) throw 'Unable to locate VirtualDJ home folder. Make sure to have VirtualDJ installed.';

  const JSZip = require('jszip');
  const zip = new JSZip();
  const options = {
    type              : 'nodebuffer',
    compression       : 'DEFLATE',
    compressionOptions: { level: 9 }
  };

  // Scan VirtualDJ root folder
  const vFiles = utils.readDirectoryRecursive(vdjPath).files
    .map(file => file.substr(vdjPath.length + 1))
    .filter(folder => backupList.includes(folder.split(Path.sep)[ 0 ]));

  // merge database files incl. main
  if ( !dbList ) dbList = [];
  dbList.push(Path.join(vdjPath, 'database.xml'));
  const xml = Database.merge(dbList.map(p => vdj.loadDatabase(p))).toXML();

  zip.file('database_merged.xml', xml);

  vFiles.forEach(/**@type {string}*/file => {
    zip.file(file, fs.readFileSync(Path.join(vdjPath, file)), { binary: true });
  });

  // info
  zip.file(
    'README.txt',
    `Created with ${ info.name } version ${ info.version } (https://github.com/silverspex/${ info.name })\nBackup date: ${ new Date }`
  );

  try {
    // todo consider using generateNodeStream() instead
    const zipFile = await zip.generateAsync(options);
    fs.writeFileSync(dstPath, zipFile);
    return true;
  }
  catch(err) {
    debug(err);
    return false;
  }
}

module.exports = backup;
