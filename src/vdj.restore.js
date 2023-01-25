/**************************************
 *
 *  Restore module
 *
 *  Copyright (c) 2019 Epistemex
 *
 *************************************/

'use strict';

const fs = require('fs');
const Path = require('path');
const info = require('../package.json');

/**
 * Restores a backup zip file either made by VirtualDJ software or with
 * this package using `vdj.backup()`.
 *
 * CAUTION: all files in destination will be overwritten! Use the optional
 * `dstPath` argument to test folder structure and content first.
 *
 * @param {string} zipPath - path to VirtualDJ or vdj-data zip file to restore.
 * @param {string} dstPath - path to restore to, Normally the home folder (getVDJFolders().homeFolder).
 * @returns {Promise<Boolean>}
 */
function restore(zipPath, dstPath) {
  return new Promise((resolve, reject) => {

    const mkdirp = require('mkdirp');
    const JSZip = require('jszip');

    let data;
    try {
      data = fs.readFileSync(zipPath);
    }
    catch(err) {
      debug(err);
      reject(false);
    }

    JSZip.loadAsync(data)
      .then(zip => {
        const keys = Object.keys(zip.files).filter(key => !key.endsWith('README.txt'));
        let isVDJ = keys.includes('settings_backup.xml');
        let done = 0;

        // validate
        if ( !((keys.includes('database_merged.xml') || keys.includes('database.xml')) && (keys.includes('settings.xml') || isVDJ)) ) {
          throw 'Not a supported backup archive.';
        }

        // extract and save each file
        keys.forEach(key => {
          const file = zip.files[ key ];
          const path = Path.join(dstPath, file.name);
          mkdirp.sync(Path.dirname(path));

          zip.file(file.name)
            .async('nodebuffer')
            .then(data => {
              // save data
              const path = Path.join(dstPath, file.name);
              fs.writeFileSync(path, data);
              if ( ++done === keys.length ) {
                // done, todo split database_merge.xml, for now rename - WIP
                if ( isVDJ ) {
                  try {
                    fs.renameSync(Path.join(dstPath, 'settings_backup.xml'), Path.join(dstPath, 'settings.xml'));
                  }
                  catch(err) {debug(err);}
                }
                else {
                  try {
                    fs.renameSync(Path.join(dstPath, 'database_merged.xml'), Path.join(dstPath, 'database.xml'));
                  }
                  catch(err) {debug(err);}
                }

                try {
                  const data = `Restored using ${ info.name } version ${ info.version } (https://github.com/Epistemex/${ info.name })\nRestored: ${ new Date }`;
                  fs.writeFileSync(Path.join(dstPath, 'RESTORED.txt'), data, 'utf-8');
                }
                catch(err) {debug(err);}

                resolve(true);
              }
            })
            .catch(err => {
              debug(err);
              reject(false);
            });
        });

      })
      .catch(err => {
        debug(err);
        reject(false);
      });

  });
}

module.exports = restore;