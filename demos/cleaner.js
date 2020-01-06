/**************************************
 *
 *  Cleaner demo.
 *
 *  USAGE:
 *
 *    node cleaner <path-to-database.xml>
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

'use strict';

const Path = require('path');
const vdj = require('../index');
const { cleaner, compile, defOptions } = require('../src/cleaner');

const path = process.argv[ 2 ];
if ( !path ) console.log('USAGE: node cleaner <path-to-database.xml>');

const db = vdj.loadDatabase(path);
if ( !db ) return console.log('Sorry, could not load database - please check path.');

console.log(`Scanning ${ db.songs.length } songs...`);

const options = Object.assign(defOptions, { format: '%artist %featuring' });
let count = 0;

db.songs.forEach(song => {
  const file = Path.basename(song.filePath).substr(0);
  const base = file.substr(0, file.lastIndexOf('.'));

  const c = cleaner(base);
  if ( c.artists.length && c.title && c.remix ) {
    song.tags.artist = compile(c, options);
    song.tags.title = c.title;
    song.tags.remix = c.remix;
    song.tags.album = null;
    song.comment = null;
    count++;
  }
});

console.log('Saving...');

db.write(path);

console.log(`Done. Cleaned ${ count } songs...`);