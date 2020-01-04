/**************************************
 *
 *  List top 100 most played tracks
 *
 *  USAGE:
 *
 *      node list-top-100 <path-to-database.xml>
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const vdj = require('../index');
const path = process.argv[ 2 ];
if ( !path ) console.log('USAGE: node list-top-100 <path-to-database.xml>');

const db = vdj.loadDatabase(path);
if ( !db ) return console.log('Sorry, could not load database - please check path.');

  // sort song by play count
function fnSort(a, b) {
  a = a.infos.playCount | 0;  // force value to integer
  b = b.infos.playCount | 0;
  return a < b ? 1 : (a > b ? -1 : 0);
}

console.log(
  db.songs.sort(fnSort).slice(0, 100)
    // make sure tags are filled (by abusing the filter fn)
    .filter(song => {
      if ( !song.tags.artist || !song.tags.title ) song.filenameToTag();
      return true;
    })
    // format output
    .map(song => `Plays = ${ song.infos.playCount.toString().padStart(3) }: ${ song.toString() }`)
    .join('\n')
);
