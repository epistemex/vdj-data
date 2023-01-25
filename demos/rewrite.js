/**************************************
 *
 *  Load and rewrite database to clean
 *  empty space etc.
 *
 *  USAGE:
 *
 *   node rewrite <path-to-database.xml>
 *
 *  Copyright (c) 2020 Epistemex
 *
 *************************************/

'use strict';

const vdj = require('../index');

// parse command line arguments
const path = process.argv[ 2 ];
const time = Date.now();
let count = 0;

// validate args
if ( !path || !path.toLowerCase().endsWith('.xml') )
  return console.log('USAGE: node rewrite <path-to-database.xml>');

// Load database
console.log('Loading and parsing database...');
const db = vdj.loadDatabase(path);
if ( !db ) return console.log('Sorry, could not load database - please check path.');

console.log('Saving database...');
db.write(path);

// some end stats
const endTime = Date.now();
console.log(`Done in ${ ((endTime - time) / 1000).toFixed(2) } seconds!`);
