/**************************************
 *
 *  Cleaner demo.
 *
 *  USAGE:
 *
 *    node cleaner <path-to-database.xml>
 *
 *  Copyright (c) 2019-2020 Silverspex
 *
 *************************************/

'use strict';

const vdj = require('../index');

const path = process.argv[ 2 ];
const save = process.argv[ 3 ] === '-save';

if ( !path ) console.log('USAGE: node cleaner <path-to-database.xml> [-save]');

const db = vdj.loadDatabase(path);
if ( !db ) return console.log('Sorry, could not load database - please check path.');

console.log(`Scanning ${ db.songs.length } songs...`);
let count = 0;

db.songs.forEach(song => {
  const c = song.cleanName({ format: '%artist %featuring' });
  if ( c.artists.length && c.title && c.remix ) {
    if ( song.tags.artist !== c.cleaned || song.tags.title !== c.title || song.tags.remix !== c.remix ) {
      song.tags.artist = c.cleaned;
      song.tags.title = c.title;
      song.tags.remix = c.remix;
      count++;
    }
  }
});

if ( save ) {
  console.log('Saving...');
  db.snapshot();
  db.write(path);
}

console.log(`Done! Cleaned ${ count } songs...`);

