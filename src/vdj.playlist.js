/**************************************
 *
 *  Playlist object
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const fs = require('fs');
const utils = require('./utils');
const xml = require('./xml');

/**
 * Parses a playlist into either Song objects (id database list is provided)
 * and paths list (property `paths`).
 *
 * When a list of Database objects is provided, the playlist can be parsed into
 * a Song list (property `songs').
 *
 * @param {string} path - path to playlist, history list
 * @param {Array} [databaseList] - optional array containing database objects.
 * This is required for the `songs` array to be populated.
 * @constructor
 */
function Playlist(path, databaseList) {
  this.entries = [];
  this.songs = [];

  if ( path ) {
    try {
      const data = fs.readFileSync(path, 'utf-8');
      this.parse(data, databaseList);
    }
    catch(err) {
      debug(err);
      throw 'Could not load this playlist.';  // todo throws inside catch...
    }

  }

}

/* -----------------------------------------------------------------------------
  PROTOTYPE
----------------------------------------------------------------------------- */

Playlist.prototype = {
  parse: function(data, dbs) {
    let entry = null;
    data.replace(/\r/gm, '').split('\n').forEach(line => {
      line = line.trim();
      if ( line.startsWith('#') ) {
        const parts = line.split('#EXTVDJ:');
        if ( parts[ 1 ] ) entry = xml.parseTags(parts[ 1 ]);
      }
      else {
        if ( !entry ) entry = {};
        else entry.path = line;
        if ( line.length ) this.entries.push(entry);
        entry = null;
      }
    });

    this.songs = utils.lookupPaths(this.entries.map(e => e.path), dbs);
  },

  /**
   * Creates a playlist string that can be saved out as new playlist.
   */
  compile: function() {
    const pl = [];
    this.entries.forEach(e => {
      e = JSON.parse(JSON.stringify(e));  // clone!
      const path = e.path;
      delete e.path;
      //if (e.songlength) e.songlength = e.songlength.toFixed(3); //todo verify that this is not necessary...
      pl.push('#EXTVDJ:' + xml.compileTags(e));
      pl.push(path);
    });
    pl.push('');
    return pl.join('\r\n');
  },

  /**
   * Write current playlist to path in VDJ m3u compatible format.
   * @param {string} path - path, filename and m3u extension to save playlist to
   */
  write: function(path) {
    try {
      const pl = this.compile();
      fs.writeFileSync(path, pl, 'utf-8');
    }
    catch(err) {
      debug(err);
      throw 'Could not save playlist to this path.';
    }
  },

  /**
   * Add a Song object to the playlist. The method will make it initializes the
   * entries and song arrays correctly.
   * @param {Song} song - Song object to add
   * @returns {Playlist}
   */
  add: function(song) {
    this.songs.push(song);
    this.entries.push({
      path      : song.filePath,
      filesize  : song.fileSize,
      artist    : song.tags.artist,
      title     : song.tags.title,
      remix     : song.tags.remix,
      songlength: song.infos.songLength
    });
    return this
  },

  /**
   * Remove an entry based on index.
   * @param {number} i = index to remove. If out of bound the index will be ignored.
   * @returns {Playlist}
   */
  removeAt: function(i) {
    if ( i >= 0 && i < Math.min(this.songs.length, this.entries.length) ) {
      this.songs.splice(i, 1);
      this.entries.splice(i, 1);
    }
    return this
  },

  /**
   * Remove an entry based on Song object.
   * @param {Song} song = song to remove.
   * @returns {Playlist}
   */
  remove: function(song) {
    const i = this.songs.indexOf(song);
    return this.removeAt(i)
  },

  /**
   * Creates a list of entries that don't exist anymore.
   * @returns []
   */
  verifyPaths: function() {
    return this.entries.filter(e => !fs.existsSync(e.path));
  }

};

module.exports = Playlist;