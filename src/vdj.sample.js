/* ************************************
 *
 *  VDJSample object
 *
 *  Copyright (c) 2019-2020 Epistemex
 *
 *************************************/

'use strict';

const fs = require('fs');
const Path = require('path');
const utils = require('./utils');
const Color = require('./vdj.color');
const { spawnSync } = require('child_process');

const errFFmpeg = 'To use this method ffmpeg and ffprobe must be installed and available in PATH. See https://ffmpeg.org/.';

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

const keys = {
  0x00: null,
  0x01: 'Am', 0x02: 'A#m', 0x03: 'Bm', 0x04: 'Cm', 0x05: 'C#m', 0x06: 'Dm',
  0x07: 'Ebm', 0x08: 'Em', 0x09: 'Fm', 0x0A: 'F#m', 0x0B: 'Gm', 0x0C: 'G#m',
  0x0D: 'A', 0x0E: 'A#', 0x0F: 'B', 0x10: 'C', 0x11: 'C#', 0x12: 'D',
  0x13: 'D#', 0x14: 'E', 0x15: 'F', 0x16: 'F#', 0x17: 'G', 0x18: 'G#'
};

function VDJSample(path) {
  let _path = '';

  Object.defineProperties(this, {
    'path'   : {
      get       : () => _path,
      set       : (newPath) => {
        if ( typeof newPath === 'string' ) {
          _path = newPath;
          this.basename = Path.parse(_path).name;
          this.offsetData = 0x78 + _path.length;
          this.thumbOffset = this.offsetData + this.mediaSize;
        }
      },
      enumerable: true
    },
    'keyDesc': {
      get       : () => keys[ Math.max(0, Math.min(0x18, this.key)) ],
      set       : (key) => {
        const i = Object.values(keys).indexOf(this._frmKey(key));
        if ( i < 0 ) throw 'Invalid key';
        this.key = i;
      },
      enumerable: true
    },
    'gainDb' : {
      get       : () => this.gain === 0 ? 0 : 20 * Math.log10(this.gain),
      set       : (db) => this.gain = Math.max(0.0975, Math.min(3.7, Math.pow(10, db / 20))),
      enumerable: true
    }
  });

  let view, data;
  let pos = 0;

  if ( path && path.length ) {
    const buffer = utils.loadFile(path);
    if ( !buffer ) throw 'Could not load vdjsample from path.';

    const td = new TextDecoder('utf-8');
    view = new DataView(buffer.buffer);

    if ( getUint32() !== 0x4a4456 ) throw 'Not a VDJ sample file.'; // magic => 0x56444A00LE ("VDJ\0")

    this.version = getUint32() / 100;                 // 0x04
    this.offsetData = getUint32();                    // 0x08 - offset to data (or abs. header size)
    this.mediaSize = getUint32();                     // 0x0C
    this.mediaType = getUint32() & 0xff;              // 0x10
    this.tracks = getUint32() & 0xff;                 // 0x14
    this.mode = getUint32() & 0xff;                   // 0x18
    this.dropLoop = getUint32() & 0xff;               // 0x1C
    this.bpm = utils.toBPM(getFloat32());             // 0x20
    this.beatGridOffset = getFloat32();               // 0x24
    this.startTime = getFloat64();                    // 0x28
    this.duration = getFloat64();                     // 0x30
    this.totalDuration = getFloat64();                // 0x38
    this.endTime = getFloat64();                      // 0x40 (abs. time)
    this.gain = getFloat32();                         // 0x48
    this.transparencyColor = new Color(getUint32());  // 0x4C (ARGB) => A = transparency strength (tolerance) in this case
    pos += 4;                                         // 0x50 ??? video rel?
    this.offsetThumb = getUint32();                   // 0x54
    this.thumbSize = getUint32();                     // 0x58
    this.offsetPath = getUint32();                    // 0x5C
    const pathLength = getUint32();                   // 0x60
    pos += 12;                                        // 0x64-0x6f reserved?
    const key = getUint32() & 0xff;                   // 0x70
    this.keyMatchType = getUint32() & 0xff;           // 0x74

    this.key = Math.max(0, Math.min(0x18, key));

    data = new Uint8Array(buffer.buffer);

    if ( pathLength ) {
      try {
        this.path = td.decode(data.subarray(this.offsetPath, this.offsetPath + pathLength));
      }
      catch(err) {debug(err)}
    }
    else this.path = '';

    this.media = data.slice(this.offsetData, this.offsetData + this.mediaSize);
    this.thumb = this.offsetThumb && this.thumbSize ? data.slice(this.offsetThumb, this.offsetThumb + this.thumbSize) : null;
  }
  else {
    // initialize with defaults
    this.path = '';
    this.version = 8.31;
    this.offsetData = 0;
    this.mediaSize = 0;
    this.mediaType = 0;
    this.tracks = 0;
    this.mode = 0;
    this.dropLoop = 0;
    this.bpm = 120;
    this.beatGridOffset = 0;
    this.startTime = 0;
    this.duration = 0;
    this.totalDuration = 0;
    this.endTime = 0;
    this.gain = 0;
    this.transparencyColor = new Color(0);
    this.offsetThumb = 0;
    this.thumbSize = 0;
    this.offsetPath = 0x78;
    this.keyMatchType = 0;
    this.key = 0;
    this.media = null;
    this.thumb = null;
  }

  /* ---  Utility props-------------------------------------------------------*/
  Object.defineProperties(this, {
    'mediaTypeDesc'   : { enumerable: true, get: () => trackModes[ this.mediaType ] },
    'tracksDesc'      : { enumerable: true, get: () => trackModes[ this.tracks ] },
    'modeDesc'        : { enumerable: true, get: () => sampleModes[ this.mode ] },
    'dropLoopDesc'    : { enumerable: true, get: () => loopModes[ this.dropLoop ] },
    'keyMatchTypeDesc': { enumerable: true, get: () => keyMatchTypes[ this.keyMatchType ] }
  });

  this.validateTimes();

  // initialize path and basename
  this.path = path || '';

  /* ---  Error checking -----------------------------------------------------*/

  this.errors = [];

  // Checks
  if ( this.offsetThumb && this.offsetThumb === this.offsetPath ) {
    this.errors.push('WARNING: vdjsample may have corrupted path data.');
    this.offsetPath = 0x78;
    this.path = '';
  }

  /* ---  Helpers  -----------------------------------------------------------*/

  //function getUint8() {return view.getUint8(pos++)}

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
  _frmKey: function(key) {
    return (key.length > 0 && key.length <= 3)
           ? key[ 0 ].toUpperCase() + key.substr(1).toLowerCase()
           : key;
  },

  /**
   * Call this after modifying time ranges to make sure the times are valid,
   * (start is not after end, end is not after duration etc.).
   * @returns {VDJSample}
   */
  validateTimes: function() {
    if ( this.totalDuration > 0 && this.totalDuration < 36000 ) {
      if ( this.endTime > this.totalDuration ) this.endTime = this.totalDuration;
      else if ( this.endTime < 0 ) this.endTime = 0;

      if ( this.startTime > this.endTime ) this.startTime = this.endTime;
      else if ( this.startTime < 0 ) this.startTime = 0;

      this.duration = this.endTime - this.startTime;
    }
    else {
      this.startTime = this.endTime = this.duration = this.totalDuration = 0;
    }

    return this
  },

  /**
   * Save embedded media content to file.
   * @param {string} path - destination file, filename and extension.
   * @returns {boolean} true if success
   */
  saveMedia: function(path) {
    return utils.saveFile(path, this.media);
  },

  /**
   * Save embedded thumb image content to file, if any.
   * @param {string} path - destination file, filename and extension.
   * @returns {boolean} true if success
   */
  saveThumb: function(path) {
    return this.thumb && this.thumbSize ? utils.saveFile(path, this.thumb) : false;
  },

  /**
   * Set or replace media for the sample. The media can be any supported format, audio as well as video.
   * Video supports alpha channels. This method uses ffmpeg and ffprobe to convert and check. Make sure
   * they have been installed on your system and is in the global PATH (see https://ffmpeg.org).
   *
   * Provide a path to audio/video file to embed for this sample.
   *
   * @param {string} path - path to media file to embed
   * @param {boolean} [nonLossy=false] set to true for non-lossy conversion for audio files
   * @returns {VDJSample}
   * @throws on errors
   */
  setMedia: function(path, nonLossy = false) {
    let result;
    let json;
    let hasVideo = false;
    let hasAudio = false;

    // probe source file
    result = spawnSync('ffprobe', [ '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', path ], { maxBuffer: 1 << 22 });
    if ( result.error ) {
      if ( result.error.code === 'ENOENT' && result.error.path === 'ffprobe' ) throw errFFmpeg;
      else {
        throw 'Could not parse this file. Make sure it is of correct type and exist.';
      }
    }

    try {
      const jStr = result.output.toString();
      json = JSON.parse(jStr.substring(jStr.indexOf('{'), jStr.lastIndexOf('}') + 1).trim());
    }
    catch(err) {
      debug(err);
      throw 'Unable to parse metadata as JSON.';
    }

    // check for stream types
    json.streams.forEach(s => {
      if ( s.codec_type === 'audio' ) hasAudio = true;
      else if ( s.codec_type === 'video' ) hasVideo = true;
    });

    if ( !hasAudio && !hasVideo ) {
      throw 'Media file contains no supported A/V streams.'
    }

    // convert input
    if ( hasAudio && !hasVideo ) {
      if ( nonLossy ) {
        result = spawnSync('ffmpeg', [ '-y', '-i', path, '-sample_fmt', 's16', '-ar', '44100', '-f', 'flac', '-' ], { maxBuffer: 1 << 22 });
      }
      else {
        result = spawnSync('ffmpeg', [ '-y', '-i', path, '-c:a', 'libvorbis', '-b:a', '192k', '-f', 'ogg', '-' ], { maxBuffer: 1 << 22 });
      }
      this.mediaType = this.tracks = 0;
    }
    else {
      // could use h264_nvenc on Nvidia/Cuda enabled machines, but the source is usually very short..
      const vp = hasVideo ? (hasAudio ? [ '-c:v', 'libx264' ] : [ '-c:v', 'hap', '-format', 'hap_alpha' ]) : []; //todo check source for alpha, then choose HAP
      const ap = hasAudio ? [ '-c:a', 'aac' ] : [];
      const tmp = Path.join(Path.parse(path).dir, Math.random().toString().substr(1)) + '.mkv';

      result = spawnSync('ffmpeg', [ '-y', '-i', path, ...vp, ...ap, tmp ], { maxBuffer: 1 << 22 });
      result.stdout = utils.loadFile(tmp);
      fs.unlinkSync(tmp);

      this.mediaType = this.tracks = hasVideo && hasAudio ? 1 : 2;
    }

    if ( result.error ) {
      if ( result.error.code === 'ENOENT' && result.error.path === 'ffmpeg' ) throw errFFmpeg;
      else {
        throw 'Could not convert this file. Make sure it is of correct type and exist.';
      }
    }

    this.media = new Uint8Array(result.stdout.buffer);
    this.mediaSize = this.media.byteLength;
    this.totalDuration = +json.format.duration;
    this.startTime = 0;
    this.endTime = this.totalDuration;
    this.duration = this.totalDuration;
    this.path = path; // note: calculates offsets - must be last

    return this
  },

  /**
   * Set a PNG as thumb image for this sample. Max file size is 4 mb.
   * The image is stored as-is.
   * @param {string} path - path to PNG image file to embed.
   * @returns {VDJSample}
   * @throws on errors
   */
  setThumb: function(path) {
    const buffer = utils.loadFile(path);
    if ( !buffer ) throw 'Could not load PNG file from this path.';
    if ( buffer.length > 1 << 22 ) throw 'PNG is larger than 4 mb.';

    const data = new DataView(buffer.buffer);
    if ( data.getUint32(0) !== 0x89504E47 ) throw 'Need to be a PNG file.';

    this.thumb = new Uint8Array(data.buffer);
    this.thumbSize = data.byteLength;

    return this
  },

  /**
   * Compile instance into a vdjsample buffer.
   * @param {boolean} [removePath=false] - remove embedded path information if true.
   * @returns {Uint8Array} buffer holding compiled vdjsample
   * @throws on errors
   */
  compile: function(removePath = false) {
    if ( !this.media || !this.mediaSize ) throw 'No media is set.';

    const te = new TextEncoder();
    const txt = te.encode(this.path);
    const pathLength = removePath ? 0 : txt.length;
    const size = 0x78 + pathLength + this.mediaSize + this.thumbSize;

    this.validateTimes();

    const data = new Uint8Array(size);
    const view = new DataView(data.buffer);
    let pos = 0;

    setUint32(0x4a4456);               // 0x00 magic "VDJ\0"
    setUint32(830);                    // 0x04 version 8.3
    setUint32(0x78 + pathLength);      // 0x08 abs. offset to data
    setUint32(this.mediaSize);            // 0x0C media size
    setUint32(this.mediaType);            // 0x10 media type
    setUint32(this.tracks);               // 0x14 tracks
    setUint32(this.mode);                 // 0x18 mode
    setUint32(this.dropLoop);             // 0x1C
    setFloat32(utils.fromBPM(this.bpm));  // 0x20
    setFloat32(this.beatGridOffset);      // 0x24
    setFloat64(this.startTime);           // 0x28
    setFloat64(this.duration);            // 0x30
    setFloat64(this.totalDuration);       // 0x38
    setFloat64(this.endTime);             // 0x40
    setFloat32(this.gain);                // 0x48
    setUint32(this.transparencyColor.toNumber()); // 0x4C
    pos += 4;                             // 0x50 ??
    setUint32(this.thumbSize ? 0x78 + pathLength + this.mediaSize : 0);  // 0x54
    setUint32(this.thumbSize);            // 0x58
    setUint32(0x78);                   // 0x5C offset path
    setUint32(pathLength);                // 0x60
    pos += 12;
    setUint32(this.key);                  // 0x70
    setUint32(this.keyMatchType);         // 0x74

    // copy path
    if ( pathLength ) {
      data.set(txt, pos);
      pos += pathLength;
    }

    // copy media
    data.set(this.media, pos);
    pos += this.mediaSize;

    // copy thumb
    if ( this.thumbSize && this.thumb ) {
      data.set(this.thumb, pos)
    }

    function setUint32(v) {
      view.setUint32(pos, v, true);
      pos += 4;
    }

    function setFloat32(v) {
      view.setFloat32(pos, v, true);
      pos += 4;
    }

    function setFloat64(v) {
      view.setFloat64(pos, v, true);
      pos += 8;
    }

    // done
    return data
  },

  /**
   * Compile instance into a vdjsample and save it to given path.
   * @param {string} path - destination path for vdjsample (usually with the
   * extension ".vdjsample")
   * @param {boolean} [removePath=false] - remove embedded path information if true.
   * @throws on errors
   */
  write: function(path, removePath = false) {
    if ( !utils.saveFile(path, this.compile(removePath)) ) {
      throw 'Could not save sample to this path.';
    }
  }

};

VDJSample.TRACKMODE = {
  AUDIO     : 0,
  AUDIOVIDEO: 1,
  VIDEO     : 2
};

VDJSample.SAMPLEMODE = {
  DROP: 0,
  LOOP: 1
};

VDJSample.LOOPMODE = {
  FLAT     : 0,
  PITCHED  : 1,
  SYNCSTART: 2,
  SYNCLOCK : 3
};

VDJSample.KEYMATCHMODE = {
  DONOTMATCH     : 0,
  MATCHCOMPATIBLE: 1,
  MATCHEXACT     : 2
};

module.exports = VDJSample;
