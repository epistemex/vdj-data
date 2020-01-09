/* ***********************************************************************
 *
 *   Audio file related functions
 *
 *   Copyright (c) 2020 Silverspex
 *
 * *********************************************************************/

'use strict';

const Path = require('path');
const { execFileSync } = require('child_process');

/*
  from AcoustID: fingerprint matcher settings
  https://bitbucket.org/acoustid/acoustid-server/src/efb787c16ea1a0f6daf38611d12c85376d971b08/postgresql/?at=master
*/
const ACOUSTID_MAX_BIT_ERROR = 2;
const ACOUSTID_MAX_ALIGN_OFFSET = 120;

const MATCH_BITS = 14;
const MATCH_MASK = ((1 << MATCH_BITS) - 1);
const MATCH_STRIP = x => x >>> (32 - MATCH_BITS);

/**
 * Calculate a fingerprint for a given audio file. By default this produces
 * a base-64 encoded compressed version which you can use with AcoustID's own
 * web API services.
 *
 * You can however use the raw version to compare and find duplicates locally
 * using the raw flag.
 *
 * @param {string} path - path to supported media file to fingerprint
 * @param {boolean} [raw=false] - if true, output the raw uncompressed fingerprint as an array of 32-bit unsigned integers.
 * @returns {*|null}
 */
function getAudioFingerprint(path, raw = false) {
  const exePath = Path.join(__dirname, `../bin/${ process.platform.replace(/[./\\~]/g, '') }/fpcalc`);
  const args = [ '-json', path ];
  if ( raw ) args.push('-raw');

  try {
    const json = JSON.parse(execFileSync(exePath, args, { timeout: 5000 }).toString());
    json.fingerprint = new Uint32Array(json.fingerprint);
    return json
  }
  catch(err) {console.log(err)}

  return null
}

/**
 * Compare and score two raw fingerprints. A score would be between 0.0 and 1.0; you
 * could assume > 0.9 is a match and below is not, but there are no absolutes here. The
 * score represents likeliness of match only.
 *
 * @param {*} fp1 - fingerprint 1 (raw version)
 * @param {*} fp2 - fingerprint 2 (raw version)
 * @returns {number} score between 0.0 and 1.0 where higher is more likely a match
 */
function compareFingerprints(fp1, fp2) {
  // Based on: https://bitbucket.org/acoustid/acoustid-server/src/efb787c16ea1a0f6daf38611d12c85376d971b08/postgresql/acoustid_compare.c?at=master#cl-87
  // MIT license - Copyright (C) 2010-2016 Lukas Lalinsky
  const a = fp1.fingerprint;
  const b = fp2.fingerprint;

  let numCounts = a.length + b.length + 1;
  let counts = new Uint16Array(numCounts << 1);
  let i, j, topCount;

  for(i = 0; i < a.length; i++) {
    const jBegin = Math.max(0, i - ACOUSTID_MAX_ALIGN_OFFSET);
    const jEnd = Math.min(b.length, i + ACOUSTID_MAX_ALIGN_OFFSET);
    for(j = jBegin; j < jEnd; j++) {
      let bitError = bitCount(a[ i ] ^ b[ j ]);
      if ( bitError <= ACOUSTID_MAX_BIT_ERROR ) {
        let offset = i - j + b.length;
        counts[ offset ]++;
      }
    }
  }

  topCount = 0;
  for(i = 0; i < numCounts; i++) {
    if ( counts[ i ] > topCount ) topCount = counts[ i ];
  }

  return topCount / Math.min(a.length, b.length);
}

/**
 * Same as compareFingerprints() but with support for offset where offset can be
 * two similar tracks where one starts a bit later than the other or similar cases.
 * The max offset represents fingerprints indices.
 * @param {*} fp1 - fingerprint 1 (raw version)
 * @param {*} fp2 - fingerprint 2 (raw version)
 * @param {number} maxOffset - offset in number of indices of the raw fingerprint array
 * @returns {number} score between 0.0 and 1.0 where higher is more likely a match
 */
function compareFingerprintsOffset(fp1, fp2, maxOffset) {
  // Based on: https://bitbucket.org/acoustid/acoustid-server/src/efb787c16ea1a0f6daf38611d12c85376d971b08/postgresql/acoustid_compare.c?at=master#cl-119
  // MIT license - Copyright (C) 2010-2016 Lukas Lalinsky
  let a = fp1.fingerprint;
  let b = fp2.fingerprint;
  //  let a = _a.subarray(0);
  //  let b = _b.subarray(0);
  let aSize = a.length;
  let bSize = b.length;

  const numCounts = aSize + bSize + 1;
  const counts = new Uint16Array(numCounts);

  const aOffsets = new Uint16Array(MATCH_MASK << 1);
  const bOffsets = aOffsets.subarray(MATCH_MASK);
  const seen = new Uint8Array(aOffsets.buffer);

  let i, topCount, topOffset, size, bitError = 0, minSize, aUniq = 0, bUniq = 0;
  let score, diversity;

  for(i = 0; i < aSize; i++) aOffsets[ MATCH_STRIP(a[ i ]) ] = i;
  for(i = 0; i < bSize; i++) bOffsets[ MATCH_STRIP(b[ i ]) ] = i;

  topCount = 0;
  topOffset = 0;

  for(i = 0; i < MATCH_MASK; i++) {
    if ( aOffsets[ i ] && bOffsets[ i ] ) {
      let offset = aOffsets[ i ] - bOffsets[ i ];
      if ( maxOffset === 0 || (-maxOffset <= offset && offset <= maxOffset) ) {
        offset += bSize;
        counts[ offset ]++;
        if ( counts[ offset ] > topCount ) {
          topCount = counts[ offset ];
          topOffset = offset;
        }
      }
    }
  }

  topOffset -= bSize;

  minSize = Math.min(aSize, bSize) & ~1;
  if ( topOffset < 0 ) {
    //b = _b.subarray(-topOffset);
    b = b.subarray(-topOffset);
    bSize = Math.max(0, bSize + topOffset);
  }
  else {
    //a = _a.subarray(topOffset);
    a = a.subarray(topOffset);
    aSize = Math.max(0, aSize - topOffset);
  }

  size = Math.min(aSize, bSize) * 0.5;
  if ( !size || !minSize ) {
    return 0.0
  }

  seen[ 0 ] = MATCH_MASK;
  for(i = 0; i < aSize; i++) {
    let key = MATCH_STRIP(a[ i ]);
    if ( !seen[ key ] ) {
      aUniq++;
      seen[ key ] = 1;
    }
  }

  seen[ 0 ] = MATCH_MASK;
  for(i = 0; i < bSize; i++) {
    let key = MATCH_STRIP(b[ i ]);
    if ( !seen[ key ] ) {
      bUniq++;
      seen[ key ] = 1;
    }
  }

  diversity = Math.min(Math.min(1.0, (aUniq + 10) / aSize + 0.5), Math.min(1.0, (bUniq + 10) / bSize + 0.5));

  if ( topCount < Math.max(aUniq, bUniq) * 0.02 ) {
    return 0.0
  }

  for(i = 0; i < size; i++) {
    bitError += bitCount(a[ i ] ^ b[ i ]);
  }

  score = (size * 2.0 / minSize) * (1.0 - 2.0 * bitError / (32 * size));
  if ( score < 0.0 ) score = 0.0;

  if ( diversity < 1.0 ) {
    score = Math.pow(score, 8.0 - 7.0 * diversity);
  }

  return score;
}

function bitCount(n) {
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  return ((n + (n >>> 4) & 0xF0F0F0F) * 0x1010101) >>> 24;
}

module.exports = {
  getAudioFingerprint,
  compareFingerprints,
  compareFingerprintsOffset
};