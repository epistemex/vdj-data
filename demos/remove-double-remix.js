/**************************************
 *
 *  Removes remix info from title if
 *  already present in the remix field.
 *
 *  USAGE:
 *
 *   node remove-double-remix <path-to-database.xml> [show|test]
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const vdj = require('../index');

// parse command line arguments
const path = process.argv[ 2 ];
const show = process.argv[ 3 ] === 'show';
const test = process.argv[ 3 ] === 'test';
const time = Date.now();
let count = 0;

// validate args
if ( !path || !path.toLowerCase().endsWith('.xml') )
  return console.log('USAGE: node remove-double-remix <path-to-database.xml> [show|test]');

// Load database
console.log('Loading and parsing database...');
const db = vdj.loadDatabase(path);
if ( !db ) return console.log('Sorry, could not load database - please check path.');

console.log(`Scanning ${ db.songs.length } songs...`);

// main
db.songs.forEach(song => {
  const title = song.tags.title ? song.tags.title.toLowerCase() : '';
  const remix = song.tags.remix ? song.tags.remix.toLowerCase() : '';

  // is it a hit?
  if ( remix.length && title.includes(`(${ remix })`) ) {
    if ( show ) console.log(`Title: ${ song.tags.title } Remix: ${ song.tags.remix }`);

    // replace and update title
    const rx = new RegExp(`\\(${ remix.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') }\\)`, 'i');
    const newTitle = song.tags.title.replace(rx, '').trim();
    song.tags.title = newTitle.length ? newTitle : null;

    count++;
  }
});

// save (if not test mode) database
if ( count ) {
  console.log(`Saving ${ count } changes...`);
  if ( test ) console.log('Test mode - skipping saving...');
  else {
    vdj.isRunning().then(running => {
      if ( running ) console.warn('WARNING: VirtualDJ is running, please quit and run this script again...');
      else {
        db.snapshot();
        db.write(path);
      }
    });
  }
}
else console.log('No changes. All OK.');

// some end stats
const endTime = Date.now();
console.log(`Done in ${ ((endTime - time) / 1000).toFixed(2) } seconds!`);
