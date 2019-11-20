/**************************************
 *
 *  List songs with invalid or unavailable path.
 *
 *  USAGE:
 *
 *      node list-invalids <path-to-database.xml>
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const vdj = require('../index');
const path = process.argv[ 2 ];
if ( !path ) console.log('USAGE: node list-invalids <path-to-database.xml>');

const db = vdj.loadDatabase(path);
if ( !db ) return console.log('Sorry, could not load database - please check path.');

console.log(`Scanning ${ db.songs.length } songs and verifying paths...`);
const invalids = db.verifyPaths();

console.log(invalids.map(song => song.filePath).join('\n'));
console.log(`Found ${ invalids.length } invalid or unavailable paths...`);