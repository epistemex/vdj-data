/**************************************
 *
 *  Song object
 *
 *  Copyright (c) 2019-2020 Epistemex
 *
 *************************************/

'use strict';

const crypto = require('crypto');
const Path = require('path');
const fs = require('fs');

const utils = require('./utils');
const Tags = require('./vdj.tags');
const Infos = require('./vdj.infos');
const Scan = require('./vdj.scan');
const Poi = require('./vdj.poi');
const { cleaner, defOptions } = require('./cleaner');

const services = {
  'va': 'iDJPool',
  'cb': 'Digitrax',
  'vj': 'VJPro'
};

/**
 * Instance of a Song with normalized property names (JavaScript camel-case)
 * and type casting.
 * @param {*} [json] - optional Infos JSON from XML branch. A string is handled as path and initialize with basic path/size info. If none an empty instance is created.
 * @param {number} [initFlags] only used to initialize flags when loading song from disk (to set video/karaoke flags etc.)
 * @constructor
 */
function Song(json = {}, initFlags) {
  if ( typeof json === 'string' ) return Song.fromFile(json);

  let _flags = 0;
  let _audioOnly = true;
  let _karaoke = false;
  let _video = false;
  let _netsearch = false;
  let _netservice = null;

  this.path = utils.toStr(json.FilePath);
  this.fileSize = utils.toInt(json.FileSize);

  this.tags = new Tags(json.Tags ? json.Tags : {});
  this.scan = new Scan(json.Scan ? json.Scan : {});
  this.infos = new Infos(json.Infos ? json.Infos : {});

  this.pois = [];
  if ( Array.isArray(json.Poi) ) {
    json.Poi.forEach(poi => this.pois.push(new Poi(poi)));
  }

  this.comment = utils.toStr(json.Comment);
  this.customMix = utils.toStr(json.CustomMix);
  this.link = json.Link ? utils.toStr(json.Link.Cover) : null;

  Object.defineProperties(this, {
    'audioOnly' : { enumerable: true, get: () => _audioOnly },
    'video'     : { enumerable: true, get: () => _video },
    'karaoke'   : { enumerable: true, get: () => _karaoke },
    'netsearch' : { enumerable: true, get: () => _netsearch },
    'netservice': { enumerable: true, get: () => _netservice },
    'flags'     : {
      enumerable: true,
      get       : () => _flags,
      set       : v => {
        _flags = v | 0;
        _karaoke = !!(_flags & Song.FLAG.karaoke);
        _video = !!(_flags & Song.FLAG.video);
        _netsearch = _flags & Song.FLAG.netsearch;
        _audioOnly = !_video && !_karaoke && !_netsearch;
        _netservice = _netsearch ? services[ this.path.substr(12, 2)
          .toLowerCase() ] || 'unknown' : null;
      }
    }
  });

  this.flags = typeof initFlags === 'number' ? initFlags : utils.toInt(json.Flag);
  this.hash = null;
}

/* -----------------------------------------------------------------------------
  PROTOTYPE
----------------------------------------------------------------------------- */

Song.prototype = {

  /**
   * Convert instance to JSON representation with database property names.
   * @returns {*}
   */
  toJSON: function() {
    const json = {
      Tags : this.tags.toJSON(),
      Infos: this.infos.toJSON(),
      Scan : this.scan.toJSON(),
      Poi  : []
    };

    // Song
    if ( this.path ) json.FilePath = utils.fromStr(this.path);
    if ( this.fileSize ) json.FileSize = this.fileSize.toString();
    if ( this.flags ) json.Flag = this.flags.toString();

    //POIs
    for(let poi of this.pois) json.Poi.push(poi.toJSON());

    // Global
    if ( this.comment ) json.Comment = this.comment;
    if ( this.customMix ) json.CustomMix = this.customMix;
    if ( this.link ) json.Link = { Cover: this.link };

    return json;
  },

  /**
   * Convert instance to XML representation.
   * @returns {string}
   */
  toXML: function() {
    const song = { FilePath: this.path, FileSize: this.fileSize, Flag: this.flags === 0 ? null : this.flags };
    const attr = utils.getAttrList(song);
    const xml = [
      ` <Song ${ utils.attrListToKVString(attr) }>`,
      this.tags.toXML(),
      this.infos.toXML()
    ];

    if ( this.comment ) xml.push(`  <Comment>${ utils.toEntities(this.comment) }</Comment>`);

    xml.push(this.scan.toXML());

    this.pois.forEach(poi => xml.push(poi.toXML()));

    if ( this.customMix ) xml.push(`  <CustomMix>${ utils.toEntities(this.customMix) }</CustomMix>`);
    if ( this.link ) xml.push(`  <Link Cover="${ utils.toEntities(this.link) }" />`);

    xml.push(' </Song>');

    return xml.filter(x => x.length).join('\r\n');
  },

  /**
   * Convert filename to tags for artist, title, remix and year.
   * Based on cleanName().
   */
  filenameToTag: function() {
    const c = this.cleanName({ format: '%artist %featuring %presents' });
    if ( c ) {
      if ( c.artists.length ) this.tags.artist = c.cleaned;
      if ( c.title ) this.tags.title = c.title;
      if ( c.remix ) this.tags.remix = c.remix;
      if ( c.year ) this.tags.year = c.year;
    }
    return !!c
  },

  tagsToFilename: function(options) {
    // todo implement tagsToFilename()
  },

  /**
   * Advanced filename cleaner using file basename in an attempt to restructure
   * and clean up parts of the name (artist(s), title, featuring, presents, remix,
   * year etc.)
   *
   * @param {*} [compilerOptions=defOptions] - see src/cleaner for details
   * @returns {*}
   */
  cleanName: function(compilerOptions = defOptions) {
    //return cleaner(Path.parse(this.path).name, compilerOptions);
    return cleaner(Path.win32.basename(Path.parse(this.path).name), compilerOptions);
  },

  /**
   * Produces a string based on given formatting. The default formatting is:
   *
   *     %artist - %title (%remix)
   *
   * The information is extracted from the tags stored in the database. If a tag
   * is empty an empty string is returned.
   *
   * Note that the keywords are case-sensitive.
   *
   * Keywords that can be used:
   *
   *     %artist
   *     %title
   *     %remix
   *     %year
   *     %album
   *     %label
   *     %genre
   *     %trackNumber
   *     %composer
   *     %bpm
   *     %key
   *     %grouping
   *     %stars
   *     %user1
   *     %user2
   *
   * @param {string} [format="%artist - %title (%remix)"] - formatting string
   * @returns {string}
   */
  toString: function(format = '%artist - %title (%remix)') {
    const regexp = /%artist|%title|%remix|%year|%album|%label|%trackNumber|%genre|%composer|%bpm|%key|%grouping|%stars|%user1|%user2/g;
    let tmp;

    if ( !this.tags.artist || !this.tags.title ) {
      tmp = JSON.stringify(this.tags);
      if ( !this.filenameToTag() ) tmp = null;
    }

    const result = format
      .replace(regexp, kw => this.tags[ kw.substr(1) ] || '')
      .replace(/\(\)|\s-\s?$/g, '')
      .trim();

    if ( tmp ) this.tags = JSON.parse(tmp);

    return result
  },

  /**
   * Uses the Jaccard algorithm to compare similarities between two song
   * titles (artist, title and optionally remix);
   *
   * Note that the complexity of comparing all songs against each other is
   * O(n2) since the Jaccard algorithm is non-transitive. When using on large
   * databases try to pre-filter the "song-set before comparing to reduce the
   * processing time.
   *
   * @param {Song} song - song to compare this instance to.
   * @param {*} [options] - options
   * @param {*} [options.includeRemix=true] - include the remix field in the comparision
   * @param {*} [options.bigramsCount=3] - number of bigram elements before comparing.
   * @returns {number}
   */
  similarity: function(song, options) {
    options = Object.assign({}, {
      includeRemix: true,
      bigramsCount: 3,
      preFilter   : false
    }, options);

    if ( !song ) return 0;

    const format = `%artist %featuring %title${ options.includeRemix ? ' %remix' : '' }`;
    const b1 = utils.toBigrams(this.toString(format), options.preFilter);
    const b2 = utils.toBigrams(song.toString(format), options.preFilter);

    if ( b1.length < options.bigramsCount || b2.length < options.bigramsCount ) return 0;
    return utils.jIndex(b1, b2);
  },

  /**
   * Verifies the file path.
   * @returns {boolean}
   */
  verifyPath: function() {
    return fs.existsSync(this.path);
  },

  /**
   * Renames the file name/path and also updates this Song instance.
   * @param newName
   * @private for now...
   */
  rename: function(newName) {

  },

  /**
   * Sort POIs by time position.
   */
  sortPOIs: function() {
    this.pois.sort((a, b) => {
      return utils.eq(a.pos, b.pos) ? 0 : (a.pos < b.pos ? -1 : 1)
    })
  },

  /**
   * Get tags from referenced file path in this instance.
   *
   * The Promise returns a JSON object with all available tags,
   * or null if unsuccessful (no tags or no file).
   * @returns {Promise<*|null>}
   */
  getFileTags: function() {
    return utils.getFileTags(this.path)
  },

  getSeratoTags: function() {
    // only support for MP3 files for now
    if ( this.path && this.path.toLowerCase().endsWith('.mp3') ) {
      return require('./serato.id3')(this.path);
    }
    return null
  },

  setSeratoTags: function(newPath) {

  },

  /**
   * Calc a MD5 hash for the media file referenced in this instance.
   * The hash is also stored as a property (`instance.hash`).
   *
   * Note that if max is set and the file size is larger, the file
   * is ignored completely rather than loading just a part.
   *
   * @param {number} [max=-1] max filesize in bytes, default = any size (-1)
   * @returns {string|null} hash string, or null if any error occurred.
   */
  calcMD5Hash: function(max = -1) {
    this.hash = null;
    max = max >>> 0;

    if ( max && this.verifyPath() && fs.statSync(this.path).size < max ) {
      try {
        const file = utils.loadFile(this.path);
        if ( file ) {
          this.hash = crypto
            .createHash('md5')
            .update(file)
            .digest('hex');
        }
      }
      catch(err) {
        debug(err);
      }
    }

    return this.hash
  }

};

/* -----------------------------------------------------------------------------
  ENUMS
----------------------------------------------------------------------------- */

// These are valid with database v8.4 and possible since v8. No guarantee for
// future versions since these are unofficial and undocumented.
Song.FLAG = { // todo WIP
  hidden   : 1 << 0,  // hidden from search
  notfound : 1 << 4,  // path/file not found (when showing up in results/lists i.e. strike icon)
  karaoke  : 1 << 5,
  video    : 1 << 6,
  netsearch: 1 << 8 // still need to confirm but looks very likely based on type grouping
  //netsearch: 1 << 11, // ?? also set on netsearch in main db (result status?)
  //oldSample: 1 << 17, // < v8.3 correlates with old vdjsamples, but also some wav files....
};

/* -----------------------------------------------------------------------------
  STATICS
----------------------------------------------------------------------------- */

Song.fromFile = function(path, flags) {
  try {
    const stat = fs.statSync(path);
    const song = new Song(undefined, flags);
    song.path = path;
    song.fileSize = stat.size;
    return song;
  }
  catch(err) {
    debug(err);
  }
  return null;
};

Song.Tags = Tags;
Song.Scan = Scan;
Song.Infos = Infos;
Song.Poi = Poi;

module.exports = Song;
