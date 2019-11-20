/**************************************
 *
 *  Backup main database only (for demo)
 *  Saves zip archive to current folder.
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const Path = require('path');
const vdj = require('../index.js');
const drives = isWin ? vdj.getDrivePaths(true, false).map(path => Path.join(path, 'database.xml')) : undefined;

(async () => {
  const status = await vdj.backup('backup-demo.zip', drives);
  console.log(status ? 'OK. Saved as "backup-demo.zip" in current folder.' : 'SORRY, Could not create zip backup...');
})();
