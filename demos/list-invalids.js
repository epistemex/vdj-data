/* ************************************************
 *
 *  List songs with invalid or unavailable path.
 *
 *  USAGE:
 *
 *      node list-invalids [path-to-database.xml]
 *
 * If no path is given it will check all databases.
 *
 *  Copyright (c) 2019-2020 Epistemex
 *
 *************************************************/

'use strict';

const vdj = require('../index');
const path = process.argv[ 2 ];

const db = (path ? vdj.loadDatabase(path) : vdj.Database.merge(vdj.loadAllDatabases()));

if ( !db ) return console.log('Sorry, could not load database(s) - please check path.');

console.log(`Scanning ${ db.songs.length } songs and verifying paths...`);
const invalids = db.verifyPaths();

console.log(invalids.map(song => song.path).join('\n'));
console.log(`Found ${ invalids.length } invalid or unavailable paths...`);