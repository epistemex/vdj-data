/* ***********************************************************************
 *
 *   List Serato tags in MP3, if any
 *
 *   Copyright (c) 2020 Epistemex
 *
 * *********************************************************************/

'use strict';

const util = require('util');
const vdj = require('../index');
const path = process.argv[ 2 ];
if ( !path || !path.toLowerCase().endsWith('.mp3') ) {
  console.log('USAGE:\n');
  console.log('  node demos\\serato <path-to-mp3-file-with-serato-tags>');
  return;
}

// load as Song object
const song = new vdj.Database.Song(path);

if ( song.verifyPath() ) {
  // get Serato tags, if any
  const seratoTags = song.getSeratoTags();

  // Show result in cli
  console.log(util.inspect(seratoTags, { depth: null, colors: true, maxArrayLength: 32 }));
}
else console.log('Could not find this file.');

