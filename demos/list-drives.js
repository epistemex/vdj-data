/**************************************
 *
 * List system drives (windows) where
 * a VirtualDJ database is found.
 *
 * USAGE:
 *
 *     node list-drives
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const vdj = require('../index');
if ( !isWin ) return console.log('Sorry, currently only working on Windows...');

// format helpers
const getFolder = d => d.folder.padEnd(24);
const getSize = d => (d.size / 1024 / 1024 / 1024).toFixed(0).padStart(4);
const getMain = d => d.main ? 'MAIN' : '    ';
const formatter = d => `${ getFolder(d) } ${ getSize(d) } GB  ${ getMain(d) }  ${ d.type }`;

// show all drives
console.log('\nAll drives with a VirtualDJ database:\n');
console.log(vdj.getDrives(true).map(formatter).join('\n'));

// show drives respecting ignoreDrives (Windows)
console.log('\nAll drives with a VirtualDJ database and respecting ignoreDrives settings:\n');
console.log(vdj.getDrives().map(formatter).join('\n'));
