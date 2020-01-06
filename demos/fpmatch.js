/* ***********************************************************************
 *
 *   Get fingerprint match score between two audio files
 *
 *  USAGE:
 *
 *      node fpmatch <file1> <file2>
 *
 *   Copyright (c) 2020 Silverspex
 *
 * *********************************************************************/

'use strict';

const vdj = require('../index');

if ( process.argv.length < 4 ) {
  return console.log('Usage: node fpmatch <file1> <file2>');
}

const fp1 = vdj.utils.getAudioFingerprint(process.argv[ 2 ], true);
const fp2 = vdj.utils.getAudioFingerprint(process.argv[ 3 ], true);

if ( !fp1 || !fp2 ) return console.log('Please check file paths and try again.');

console.log(`\nDurations: file 1 = ${ fp1.duration.toFixed(2) } s, file 2 = ${ fp2.duration.toFixed(2) } s`);

const score = vdj.utils.compareFingerprints(fp1, fp2);
console.log(`Score: ${ (score * 100).toFixed(2) }% match.`);