/**************************************
 *
 *  Database object
 *
 *  Copyright (c) 2019-2020 Silverspex
 *
 *************************************/

'use strict';

const Path = require('path');
const fs = require('fs');
const utils = require('./utils');
const Song = require('./vdj.song');

/**
 * Host object for database objects (Songs, POIs).
 * If no database object is given, a new empty database is created.
 * @param {*} [json] - Optional JSON object loaded via vdj.loadDatabase().
 * @param {string|null} [path] - path to this database
 * @constructor
 */
function Database(json, path = null) {
  this.songs = [];
  this.version = '8.4';
  this.path = path;
  this.rootDrive = path ? utils.getRoot(path) : null;

  if ( json && json.VirtualDJ_Database ) {
    this.version = json.VirtualDJ_Database.Version;

    if ( parseFloat(this.version) < 8 ) {
      console.log('Warning: Older databases version (pre-v8) may not be parsed properly.');
    }

    (json.VirtualDJ_Database.Song || [])
      .forEach(song => this.songs.push(new Song(song)));
  }

  this.versionNum = this._getNumVersion();
}

/* -----------------------------------------------------------------------------
  PROTOTYPE
----------------------------------------------------------------------------- */

Database.prototype = {
  _validatePath: function(path) {
    path = path.toLowerCase();
    for(let i = 0; i < this.songs.length; i++) {
      if ( this.songs[ i ].filePath.toLowerCase() === path ) return false;
    }
    return true;
  },

  _getNumVersion: function() {
    return parseFloat(this.version);
  },

  /**
   * Loads a music or video file and returns a Song object from it.
   * This call will only initialize path and file size.
   * @param {string} [path] - provide a path to a media file to pre-fill Song object with basic info (path, size)
   * @param {number} [flags] - initialize flags (for new Song objects) such as video, karaoke flags.
   * @returns {Song|null}
   * @see loadSongAndTags()
   */
  loadSong: function(path, flags) {
    return Database.Song.fromFile(path, flags);
  },

  /**
   * Load a supported media file and attempts to extract tags information from it
   * including bitrate and duration. A Song object is returned regardless, but
   * in case or error a null is returned (invalid path, file type etc.).
   *
   * @param {string} path - path to supported media file
   * @returns {Promise<Song|null>} - resolves with the initialized Song object
   * @see loadSong()
   * @async
   */
  loadSongAndTags: async function(path) {
    let flags = 0;
    const mediaTypes = utils.getMediaTypes(path);
    if ( mediaTypes.video ) flags |= Song.FLAG.video;
    if ( mediaTypes.karaoke ) flags |= Song.FLAG.karaoke;

    const song = this.loadSong(path, flags);

    try {
      const meta = await utils.getFileTags(path);
      if ( !meta ) return song;

      const info = meta.format;

      if ( info.bitrate ) {
        song.infos.bitrate = Math.round(info.bitrate * 0.001).toString();
      }
      else if ( info.numberOfChannels && info.bitsPerSample && info.sampleRate ) {
        song.infos.bitrate = Math
          .round(info.numberOfChannels * info.bitsPerSample * info.sampleRate * 0.001)
          .toString();
      }
      if ( info.duration ) song.infos.songLength = info.duration.toFixed(6);

      const tags = meta.common;
      if ( tags.artist ) song.tags.artist = tags.artist;
      if ( tags.title ) song.tags.title = tags.title;
      if ( tags.subtitle ) song.tags.subtitle = tags.subtitle;
      if ( tags.genre && tags.genre.length ) song.tags.genre = tags.genre.join(', ');
      if ( tags.album ) song.tags.album = tags.album;
      if ( tags.year ) song.tags.year = tags.year.toString();
      if ( tags.label ) song.tags.label = tags.label.join(', ');
      if ( tags.comment ) song.tags.comment = tags.comment.join(', ');
      if ( tags.bpm ) song.tags.bpm = tags.bpm;
      if ( tags.key ) song.tags.key = tags.key;

      return song;
    }
    catch(err) {
      debug(err);
    }

    return null;
  },

  /**
   * Add a Song object to the database. Validates uniqueness by default (path).
   * @param {Song} song - add Song object to database
   * @param {Boolean} [validate=true] - validate uniqueness of file path.
   * @returns {boolean}
   */
  add: function(song, validate = true) {
    if ( !(song instanceof Song) || (validate && !this._validatePath(song.filePath)) ) return false;
    this.songs.push(song);
    return true;
  },

  /**
   * Remove a Song from the database using a Song object.
   * @param {Song} song - Song object to remove. If out of range a null will be returned.
   * @returns {Song|null} the removed Song object, or null if out of range or not found
   */
  remove: function(song) {
    let i = this.songs.indexOf(song);
    return this.removeAt(i);
  },

  /**
   * Remove a Song from the database using an index.
   * @param {number} i - index to remove. If out of range a null will be returned.
   * @returns {Song|null} the removed Song object, or null if out of range or not found
   */
  removeAt: function(i) {
    return i >= 0 && i < this.songs.length ? this.songs.splice(i, 1)[ 0 ] : null;
  },

  toJSON: function() {
    return {
      version  : this.version,
      rootDrive: this.rootDrive,
      songs    : JSON.parse(JSON.stringify(this.songs))
    };
  },

  /**
   * Converts Database object to a XML string that cane be saved
   * as a database.xml file.
   * @returns {string}
   */
  toXML: function() {
    const xml = [];
    if ( this.versionNum >= 8.4 ) xml.push('<?xml version="1.0" encoding="UTF-8"?>');
    xml.push(`<VirtualDJ_Database Version="${ this.version }">`);
    this.songs.forEach(song => xml.push(song.toXML()));
    xml.push('</VirtualDJ_Database>', '');

    return xml.join('\r\n');
  },

  /**
   * Locate Song object based on its filepath.
   * @param {string} path - path used for Song object
   * @returns {null|*} Song if found, otherwise null
   */
  findSongByPath: function(path) {
    path = path.toLowerCase();
    for(let song of this.songs) {
      if ( song.filePath.toLowerCase() === path ) return song;
    }
    return null;
  },

  /**
   * Search the database for keywords. Multiple keywords may be provided separated
   * by a space. By default options has artists, title and remix from tags enabled.
   * @param {string} keywords - keyword or keywords separated with space
   * @param {*} [options] - options enable or disable fields to search in.
   * @returns []
   */
  search: function(keywords, options) { // todo WUP
    options = Object.assign({
      path   : false,
      artist : true,
      title  : true,
      remix  : true,
      album  : false,
      genre  : false,
      comment: false,
      bpm    : false,
      year   : false
    }, options);

    const result = [];
    const words = keywords.split(' ').map(w => w.toLowerCase());

    // todo BPM + range, year + range, wildcards?

    this.songs.forEach(song => {
      const elements = [];
      if ( options.artist && song.tags.artist ) elements.push(song.tags.artist);
      if ( options.title && song.tags.title ) elements.push(song.tags.title);
      if ( options.remix && song.tags.remix ) elements.push(song.tags.remix);
      if ( options.album && song.tags.album ) elements.push(song.tags.album);
      if ( options.genre && song.tags.genre ) elements.push(song.tags.genre);
      if ( options.path && song.filePath ) elements.push(song.filePath);

      const str = elements.join(' ').toLowerCase();
      if ( _match(str, words) ) result.push(song);
    });

    function _match(str, words) {
      for(let word of words) {
        if ( !str.includes(word) ) return false;
      }
      return true;
    }

    return result;
  },

  cleanNames: function() {
    this.songs.forEach(song => song.cleanName());
  },

  /**
   * Verifies Songs' file path. A list of Song objects is returned when a Song's
   * path could not be verified. Note that the database may old references to
   * path on removable drives etc. which may not be currently available.
   *
   * @returns [] - list of Songs who's path could not be verified.
   */
  verifyPaths: function() {
    return this.songs.filter(song => !song.verifyPath());
  },

  /**
   * Write this instance as a database XML file that can be used by VirtualDJ.
   * @param {string} path - where the database file will be saved.
   * @returns {boolean}
   */
  write: function(path) {
    try {
      fs.writeFileSync(path, this.toXML(), 'utf-8');
      return true;
    }
    catch(err) {
      debug(err);
      return false;
    }
  },

  /**
   * Pipe the generated database.xml content to a write stream.
   * @param { WriteStream } ws - stream to pipe (write) to.
   * @param {boolean} [close=false] close the stream when done
   * @returns {*}
   */
  writeStream: function(ws, close = false) {
    return close ? ws.end(this.toXML(), 'utf-8') : ws.write(this.toXML(), 'utf-8');
  },

  /**
   * Takes a snapshot (or quick backup) of the database file.
   * The backup file (with .bakN extension where N is a number) is saved
   * to the same folder as the original.
   *
   * @param {number} [limit=99] maximum number of backups. If limit is reach
   * the last one (=limit) will be overwritten.
   * @returns {boolean} true if successful.
   */
  snapshot: function(limit = 99) {
    if ( this.path ) {
      let i = 0;
      try {
        while( fs.existsSync(`${ this.path }.bak${ i }`) && i < limit ) i++;
        fs.copyFileSync(this.path, `${ this.path }.bak${ i }`);
        return true
      }
      catch(err) {
        debug(err);
        return false
      }
    }
  }
};

/* -----------------------------------------------------------------------------
  STATICS
----------------------------------------------------------------------------- */

/**
 * Will merge a list of databases (from various drives) into a single database
 * to allow simpler handling.
 * IMPORTANT: use the split() function to separate the database entries back to
 * single database files before saving!
 * @param {Array} list - list of Database objects
 * @param {*} [options={}] option object
 * @param {boolean} [options.clone=false] clone each Song entry instead of referencing.
 * Use this if you plan to make changes to Songs and don't want the changes applied
 * to the original database objects.
 * @param {boolean} [options.removeDuplicates=true] - when merging several database sources there
 * is a risk of duplicate entries (if the ignoreDrive setting is ignored for example). This will
 * parse through and remove any duplicate entries based on the file path to the song.
 */
Database.merge = function(list, options = {}) {
  const mdb = new Database();

  options = Object.assign({
    clone           : false,
    removeDuplicates: false
  }, options);

  if ( options.clone ) {
    list.forEach(db => {
      db.songs.forEach(song => mdb.songs.push(new Song(song.toJSON())));
    });
  }
  else {
    list.forEach(db => {db ? mdb.songs.push(...db.songs) : null;});
  }

  // todo needs optimization
  if ( options.removeDuplicates ) {
    const temp = [];
    for(let i = 0; i < mdb.songs.length; i++) {
      const song = mdb.songs[ i ];
      let exists = false;
      for(let t = i + 1; t < mdb.songs.length; t++) {
        if ( mdb.songs[ i ].filePath.toLowerCase() === mdb.songs[ t ].filePath.toLowerCase() ) {
          exists = true;
          break;
        }
      }
      if ( !exists ) temp.push(song);
    }
    mdb.songs = temp;
  }

  return mdb;
};

/**
 * Split a merged database into individual Database objects. Use this only on
 * a Database object that is the result of merge().
 * @param {Database} db - Merged Database object to split.
 * @param useIgnoreDrives
 * @returns {Array} - List of Database objects representing each drive.
 */
Database.split = function(db, useIgnoreDrives = true) {
  const vdj = require('./vdj');
  const mainFolder = vdj.getVDJFolders().homeFolder;
  const mainRoot = utils.getRoot(mainFolder).toUpperCase();
  const ignoreDrives = useIgnoreDrives ? vdj.getIgnoredDrives().join('') : '';
  const mainDb = new Database(null, Path.join(mainFolder, 'database.xml'));
  const dbs = [ mainDb ];
  const roots = [ mainRoot ];

  // split
  const _hasRoot = r => (r.length ? r : mainRoot).toUpperCase();

  db.songs.forEach(song => {
    const root = _hasRoot(utils.getRoot(song.filePath));

    if ( !roots.includes(root) ) {
      dbs.push(new Database(null, Path.join(root, 'VirtualDJ/database.xml')));
      roots.push(root);
    }

    // lookup database to use and add song to it
    const i = roots.indexOf(root);
    const db = dbs[ i ];
    db.add(song, false);
  });

  // replace dbs instances in dbs list with same ref. to main for ignoreDrives
  if ( useIgnoreDrives ) {
    roots.forEach((root, i) => {
      if ( i && (ignoreDrives.includes(root[ 0 ]) || !fs.existsSync(root)) ) {  // non-available drives are merged to main
        mainDb.songs.push(...dbs[ i ].songs);
        dbs[ i ] = mainDb;
      }
    });
  }

  return [ ...(new Set(dbs)) ]; // remove duplicate references
};

Database.Song = Song;

module.exports = Database;
