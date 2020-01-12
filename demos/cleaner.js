/**************************************
 *
 *  Cleaner demo.
 *
 *  USAGE:
 *
 *    node cleaner [path-to-database.xml] [-save]
 *
 *  If no path is given all available
 *  databases are loaded and scanned.
 *
 *  Add option '-save' to save back result.
 *
 *  Copyright (c) 2019-2020 Silverspex
 *
 *************************************/

'use strict';

const vdj = require('../index');

const path = process.argv[ 2 ];
const save = process.argv[ 3 ] || process.argv[ 2 ] === '-save';

const db = (path ? vdj.loadDatabase(path) : vdj.Database.merge(vdj.loadAllDatabases()));
if ( !db ) return console.log('Sorry, could not load database(s) - please check path.');

console.log(`Scanning ${ db.songs.length } songs...`);
let count = 0;

db.songs.forEach(song => {
  const c = song.cleanName({ format: '%artist %featuring' });
  if ( c.artists.length && c.title && c.remix ) {
    if ( song.tags.artist !== c.cleaned || song.tags.title !== c.title || song.tags.remix !== c.remix ) {
      if ( c.cleaned ) song.tags.artist = c.cleaned;
      if ( c.title ) song.tags.title = c.title;
      if ( c.remix ) song.tags.remix = c.remix;
      count++;
    }
  }
});

if ( save ) {
  console.log('Saving...');
  const dbs = path ? [ db ] : vdj.Database.split(db);
  dbs.forEach(db => {
    db.snapshot();
    db.write(path);
  })
}

console.log(`Done! Cleaned ${ count } songs...`);

