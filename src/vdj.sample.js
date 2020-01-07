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

const notes = { // todo can possibly use modulo for different octaves
                //0x06: '..',
  0x10: 'C',
  0x11: 'Cm',
  0x12: 'D',
  0x13: 'Dm',
  0x14: 'E',
  0x15: 'F',
  0x16: 'Fm',
  0x17: 'G',
  0x18: 'Gm',
  0x19: 'A',
  0x1a: 'Am',
  0x1b: 'B'
};

function VDJSample(path) {
  let buffer;
  try {
    buffer = fs.readFileSync(path)
  }
  catch {throw 'Could not load vdjsample from path.'}

  this.path = path;
  this.basename = Path.parse(path).name;

  const view = new DataView(buffer.buffer);
  let pos = 0;

  // 0x00 uint32 = magic => 0x56444A00 ("VDJ\0")
  const magic = getUint32();
  if ( magic !== 0x4a4456 ) throw 'Not a VDJ sample file.';

  // 0x04 uint8  = 0x3E/0x3F/0x20 = distributable/linked/embedded? (0x20 has no file path string).
  this.type = getUint8();
  // 0x05 uint8  = 0x03 version?
  this.version = getUint8();
  // 0x06 ..       version minors?
  // 0x07 ..
  skip(2);
  // 0x08 uint32 = offset to data
  this.offsetData = getUint32();

  // 0x0C uint32 = size of embedded media file, an image may follow (total size - (offset + media size))
  this.mediaSize = getUint32();
  //this.thumbSize = buffer.length - (this.offset + this.mediaSize);

  // 0x10 ..     = file type? (0 = audio, 1 = a+v, 2 = v only ?)
  this.mediaType = getUint8();
  skip(3);

  Object.defineProperty(this, 'mediaTypeDesc', {
    get: () => trackModes[ this.mediaType ]
  });

  // 0x14 uint8  = TRACK: 0x00 = Audio, 0x01 = Audio+Video, 0x02 = Video
  this.track = getUint8();
  skip(3);

  Object.defineProperty(this, 'trackDesc', {
    get: () => trackModes[ this.track ]
  });

  // 0x18 uint8  = MODE: 0x00 = Drop, 0x01 = Loop
  this.mode = getUint8();
  skip(3);

  Object.defineProperty(this, 'modeDesc', {
    get: () => sampleModes[ this.mode ]
  });

  // 0x1C uint8  = LOOP MODE: 0x00 = Flat, 0x01 = Pitched, 0x02 = sync-start, 0x03 = Sync-Lock, DROP MODE: 0x00 = Flat, 0x01 = Pitched
  this.dropLoop = getUint8();
  skip(3);

  Object.defineProperty(this, 'dropLoopDesc', {
    get: () => loopModes[ this.dropLoop ]
  });

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
  //this.gainDb = this.gain === 0 ? 0 : 20 * Math.log10(this.gain);

  Object.defineProperty(this, 'gainDb', {
    get: () => this.gain === 0 ? 0 : 20 * Math.log10(this.gain),
    set: (db) => this.gain = Math.max(0.0975, Math.min(3.7, Math.pow(10, db / 20)))
  });

  // 0x4c uint8  = Blue (color to use for transparency)
  // 0x4d uint8  = Green
  // 0x4e uint8  = Red
  // 0x4f uint8  = Alpha/Transparency (video)
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

  // 0x70 uint8  = key: 0x10 = C, 0x11 = C#, 0x12 = D, etc. (alt. uint32)
  const key = getUint8();
  this.key = key ? key : null;
  //this.keyNote  todo: note table

  skip(3);
  // 0x74 uint8  = key type: 0x00 = don't match key, 0x01 = match comp. key, 0x02 = match exact key (alt. uint32)
  this.keyMatchType = getUint8();
  skip(3);

  Object.defineProperty(this, 'keyMatchTypeDesc', {
    get: () => keyMatchTypes[ this.keyMatchType ]
  });

  // 0x78 string = path to original source
  this.path = '';
  if ( pathLength ) {
    for(let i = 0; i < pathLength; i++) {
      const n = getUint8();
      if ( !n ) break;
      this.path += String.fromCharCode(n);
    }
  }

  if ( pos !== this.offset ) {
    // correct offset
    pos = this.offset;
    //throw 'Error: offset does not match data content. May be corrupt or type.';
  }

  const media = new Uint8Array(buffer.buffer);
  this.media = media.slice(pos, (pos += this.mediaSize));
  this.thumb = pos < buffer.length ? media.slice(pos) : null; // todo can use offsetThumb instead

  // todo only for now.. in some versions path is at end - presumed due to bugs... (check when actual thumb is used)
  if ( !this.path.length && pathLength && pathLength === this.thumbSize && this.thumb ) {
    for(let i = 0; i < this.thumb.length; i++) {
      this.path += String.fromCharCode(this.thumb[ i ]);
    }
    this.thumb = null;
    this.thumbSize = 0;
  }

  function getUint8() {return view.getUint8(pos++)}

  //  function getUint16() {
  //    const v = view.getUint16(pos, true);
  //    pos += 2;
  //    return v
  //  }

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
  }

};

module.exports = VDJSample;
