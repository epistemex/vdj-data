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

  const view = new DataView(buffer.buffer);
  let pos = 0;

  // 0x00 uint32 = magic => 0x56444A00LE ("VDJ\0")
  const magic = getUint32();
  if ( magic !== 0x4a4456 ) throw 'Not a VDJ sample file.';

  // 0x04 uint32  = version (8.00, 8.30 etc.)
  this.version = getUint32() / 100;

  // 0x08 uint32 = offset to data (or abs. header length)
  this.offsetData = getUint32();

  // 0x0C uint32 = size of embedded media file, an image may follow (total size - (offset + media size))
  this.mediaSize = getUint32();

  // 0x10 ..     = media type? (0 = audio, 1 = a+v, 2 = v only ?) bit mask?
  this.mediaType = getUint32() & 0xff;

  // 0x14 uint8  = Tracks used: 0x00 = Audio, 0x01 = Audio+Video, 0x02 = Video, bit mask?
  this.track = getUint32() & 0xff;

  // 0x18 uint8  = MODE: 0x00 = Drop, 0x01 = Loop, bit mask?
  this.mode = getUint32() & 0xff;

  // 0x1C uint8  = LOOP MODE: 0x00 = Flat, 0x01 = Pitched, 0x02 = sync-start, 0x03 = Sync-Lock, DROP MODE: 0x00 = Flat, 0x01 = Pitched. Bit mask?
  this.dropLoop = getUint32() & 0xff;

  // 0x20 f32    = BPM ( 1 / bpm * 60 )
  this.bpm = utils.toBPM(getFloat32());

  // 0x24 f32    = beat grid offset
  this.beatGridOffset = getFloat32();

  // 0x28 f64    = range start time (abs) (seconds)
  this.startTime = getFloat64();

  // 0x30 f64    = range time
  this.duration = getFloat64();

  // 0x38 f64    = total time
  this.totalDuration = getFloat64();

  // 0x40 f64    = range end time (abs)
  this.endTime = getFloat64();

  // 0x48 f32    = gain (normalized, 1 = 100% - min: 0.0974999964237213, max: 3.70749998092651) => dB = 20 x log10(n)?
  this.gain = getFloat32();

  // 0x4c uint32  = BGRA (LE) => ARGB
  this.transparencyColor = new Color(getUint32());

  // 0x50 uint32 = ??
  skip(4);

  // 0x54 uint32  = offset to thumb, maybe 0 initially
  this.offsetThumb = getUint32();

  // 0x58 uint32  = size of thumb
  this.thumbSize = getUint32();

  // 0x5C uint32 = offset to path string
  this.offsetPath = getUint32();

  // 0x60 uint32 = Length of path string
  const pathLength = getUint32();

  // 0x64-0x6f.. = ??
  skip(12);

  // 0x70 uint8  = key: 0x10 = Cm, 0x11 = C#, 0x12 = Dm, etc. (alt. uint32)
  const key = getUint8();
  this.key = key ? key : null;
  skip(3);

  // 0x74 uint8  = key type: 0x00 = don't match key, 0x01 = match comp. key, 0x02 = match exact key (alt. uint32). Bit mask?
  this.keyMatchType = getUint32() & 0xff;

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

  // 0x78 string = path to original source
  this.path = '';
  if ( pathLength ) {
    for(let i = 0; i < pathLength; i++) {
      const code = getUint8();
      if ( !code ) break;
      this.path += String.fromCharCode(code);
    }
  }

  // correct offset?
  if ( pos !== this.offsetData ) {
    pos = this.offsetData;
    debug('Had to correct offset', pos, this.offsetData)
  }

  const media = new Uint8Array(buffer.buffer);
  this.media = media.slice(pos, (pos += this.mediaSize));
  this.thumb = pos < buffer.length ? media.slice(pos) : null; // todo can use offsetThumb instead

  // todo only for now.. in some versions path is at end - presumed due to bugs... (check when actual thumb is used)
  if ( !this.path.length && pathLength && pathLength === this.thumbSize && this.thumb ) {
    for(let i = 0; i < this.thumb.length; i++) {
      const code = this.thumb[ i ];
      if ( !code ) break;
      this.path += String.fromCharCode(code);
    }
    this.thumb = null;
    this.thumbSize = 0;
  }

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

  function skip(n) {pos += n}
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
