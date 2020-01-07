/* ************************************
 *
 *  VDJSample object
 *
 *  Copyright (c) 2019-2020 Silverspex
 *
 *************************************/

'use strict';

const fs = require('fs');
const Path = require('path');
const utils = require('./utils');
const Color = require('./vdj.color');

const trackModes = {
  0: 'audio',
  1: 'audio+video',
  2: 'video'
};

const sampleModes = {
  0: 'drop',
  1: 'loop'
};

const loopModes = {
  0: 'flat',
  1: 'pitched',
  2: 'sync-start',
  3: 'sync-lock'
};

const keyMatchTypes = {
  0: 'do not match',
  1: 'match compatible key',
  2: 'match exact key'
};

const keys = { // todo non-confirmed enums mod=0xC (Problem for now 0x00 = no key set)
  0x00: 'Am', 0x01: 'A#m', 0x02: 'Bm', 0x03: 'Cm', 0x04: 'C#m', 0x05: 'Dm', 0x06: 'Ebm', 0x07: 'Em', 0x08: 'Fm', 0x09: 'F#m', 0x0A: 'Gm', 0x0B: 'G#m'
  //  0x0C: 'Am', 0x0D: 'A#m', 0x0F: 'Bm', 0x10: 'Cm', 0x11: 'C#m', 0x12: 'Dm', 0x13: 'Ebm', 0x14: 'Em', 0x15: 'Fm', 0x16: 'F#m', 0x17: 'Gm', 0x18: 'G#m',
  //  0x19: 'Am', 0x1A: 'A#m', 0x1B: 'Bm', 0x1C: 'Cm', 0x1D: 'C#m', 0x1E: 'Dm', 0x1F: 'Ebm', 0x20: 'Em', 0x21: 'Fm', 0x22: 'F#m', 0x23: 'Gm', 0x24: 'G#m'
};

function VDJSample(path) {
  let buffer;
  try {
    buffer = fs.readFileSync(path)
  }
  catch {throw 'Could not load vdjsample from path.'}

  const _getter = (name, get) => {Object.defineProperty(this, name, { get })};

  this.path = path;
  this.basename = Path.parse(path).name;

  const td = new TextDecoder('utf-8');
  const view = new DataView(buffer.buffer);
  let pos = 0;

  if ( getUint32() !== 0x4a4456 ) throw 'Not a VDJ sample file.'; // magic => 0x56444A00LE ("VDJ\0")

  this.version = getUint32() / 100;                 // 0x04
  this.offsetData = getUint32();                    // 0x08 - offset to data (or abs. header size)
  this.mediaSize = getUint32();                     // 0x0C
  this.mediaType = getUint32() & 0xff;              // 0x10
  this.track = getUint32() & 0xff;                  // 0x14
  this.mode = getUint32() & 0xff;                   // 0x18
  this.dropLoop = getUint32() & 0xff;               // 0x1C
  this.bpm = utils.toBPM(getFloat32());             // 0x20
  this.beatGridOffset = getFloat32();               // 0x24
  this.startTime = getFloat64();                    // 0x28
  this.duration = getFloat64();                     // 0x30
  this.totalDuration = getFloat64();                // 0x38
  this.endTime = getFloat64();                      // 0x40 (abs. time)
  this.gain = getFloat32();                         // 0x48
  this.transparencyColor = new Color(getUint32());  // 0x4C (ARGB) => A = transparency strength in this case
  pos += 4;                                         // 0x50 ??? video rel?
  this.offsetThumb = getUint32();                   // 0x54
  this.thumbSize = getUint32();                     // 0x58
  this.offsetPath = getUint32();                    // 0x5C
  const pathLength = getUint32();                   // 0x60
  pos += 12;                                        // 0x64-0x6f ??? reserved?
  const key = getUint32() & 0xff;                   // 0x70
  this.keyMatchType = getUint32() & 0xff;           // 0x74

  this.key = key ? key : null;

  const file = new Uint8Array(buffer.buffer);

  this.path = '';
  if ( pathLength ) {
    try {
      this.path = td.decode(file.subarray(pos, (pos += pathLength)));
    }
    catch(err) {debug(err)}
  }

  // correct offset?
  if ( pos !== this.offsetData ) {
    pos = this.offsetData;
    debug('Had to correct offset', pos, this.offsetData)
  }

  this.media = file.slice(pos, (pos += this.mediaSize));
  this.thumb = pos < buffer.length ? file.slice(pos) : null; // todo can use offsetThumb instead

  // todo only for now.. in some versions path is at end - presumed due to bugs... (check when actual thumb is used)
  if ( !this.path.length && pathLength && pathLength === this.thumbSize && this.thumb ) {
    try {
      this.path = td.decode(this.thumb);
    }
    catch(err) {debug(err)}

    this.thumb = null;
    this.thumbSize = 0;
  }

  // Utility props
  _getter('mediaTypeDesc', () => trackModes[ this.mediaType ]);
  _getter('trackDesc', () => trackModes[ this.track ]);
  _getter('modeDesc', () => sampleModes[ this.mode ]);
  _getter('dropLoopDesc', () => loopModes[ this.dropLoop ]);
  _getter('keyMatchTypeDesc', () => keyMatchTypes[ this.keyMatchType ]);

  Object.defineProperty(this, 'keyDesc', {
    get: () => this.key > 0 ? keys[ this.key % 0xc ] : null  // todo untested
    //set: (key) ...
  });

  Object.defineProperty(this, 'gainDb', {
    get: () => this.gain === 0 ? 0 : 20 * Math.log10(this.gain),
    set: (db) => this.gain = Math.max(0.0975, Math.min(3.7, Math.pow(10, db / 20)))
  });

  function getUint8() {return view.getUint8(pos++)}

  function getUint32() {
    const v = view.getUint32(pos, true);
    pos += 4;
    return v
  }

  function getFloat32() {
    const v = view.getFloat32(pos, true);
    pos += 4;
    return v
  }

  function getFloat64() {
    const v = view.getFloat64(pos, true);
    pos += 8;
    return v
  }
}

VDJSample.prototype = {
  _save: function(path, data) {
    try {
      fs.writeFileSync(path, data);
      return true
    }
    catch(err) {
      debug(err);
      return false
    }
  },

  saveMedia: function(path) {
    return this._save(path, this.media);
  },

  saveThumb: function(path) {
    return this.thumb && this.thumbSize > 1024 ? this._save(path, this.thumb) : false;
  },

  compile: function(removePath = false) {

  }

};

module.exports = VDJSample;
