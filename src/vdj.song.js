/**************************************
 *
 *  Song object
 *
 *  Copyright (c) 2019-2020 Silverspex
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
const { cleaner } = require('./cleaner');

/**
 * Instance of a Song with normalized property names (JavaScript camel-case)
 * and type casting.
 * @param {*} [json] - optional Infos JSON from XML branch. If none an empty instance is created.
 * @constructor
 */
function Song(json = {}) {
  this.filePath = utils.toStr(json.FilePath);
  this.fileSize = utils.toInt(json.FileSize);
  this.flags = utils.toInt(json.Flag);
  if ( isNaN(this.flags) ) this.flags = null; // todo move to toInt..

  this.tags = new Tags(json.Tags ? json.Tags : {});
  this.scan = new Scan(json.Scan ? json.Scan : {});
  this.infos = new Infos(json.Infos ? json.Infos : {});

  this.pois = [];
  if ( json.Poi ) {
    for(let i = 0; i < json.Poi.length; i++) {
      this.pois.push(new Poi(json.Poi[ i ]));
    }
  }

  this.comment = utils.toStr(json.Comment);
  this.customMix = utils.toStr(json.CustomMix);
  this.link = json.Link ? utils.toStr(json.Link.Cover) : null;

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
    if ( this.filePath ) json.FilePath = utils.fromStr(this.filePath);
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
    const song = { FilePath: (this.filePath), FileSize: this.fileSize, Flag: this.flags };
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

  /**
   * Advanced filename cleaner using file basename in an attempt to restructure
   * and clean up parts of the name (artist(s), title, featuring, presents, remix,
   * year etc.)
   *
   * @param {*} [compilerOptions] - see src/cleaner for details
   * @returns {*}
   */
  cleanName: function(compilerOptions = {}) {
    return cleaner(Path.parse(this.filePath).base, compilerOptions);
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
    return format.replace(regexp, kw => this.tags[ kw.substr(1) ] || '').replace('()', '').trim();
  },

  /**
   * Verifies the file path.
   * @returns {boolean}
   */
  verifyPath: function() {
    return fs.existsSync(this.filePath);
  },

  /**
   * Renames the file name/path and also updates this Song instance.
   * @param newName
   * @private for now...
   */
  rename: function(newName) {

  },

  filenameToTags: function(options) {

  },

  tagsToFilename: function(options) {

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
    return utils.getFileTags(this.filePath)
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

    if ( max && fs.existsSync(this.filePath) && fs.statSync(this.filePath).size < max ) {
      try {
        const file = utils.loadFile(this.filePath);
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
  STATICS
----------------------------------------------------------------------------- */

Song.Tags = Tags;
Song.Scan = Scan;
Song.Infos = Infos;
Song.Poi = Poi;

module.exports = Song;
