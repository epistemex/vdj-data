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
   * NOTE: Tracks are based on Song list so if a track was not found in
   * the database during parsing, it won't be included in the new playlist.
   * Use the `usePath` option to use paths instead.
   *
   * @param {Boolean} [usePaths=false] use paths to generate playlist instead of Song list.
   */
  compile: function(usePaths = false) {
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
   * Creates a list of entries that don't exist anymore.
   * @returns []
   */
  verifyPaths: function() {
    return this.entries.filter(e => !fs.existsSync(e.path));
  }

};

module.exports = Playlist;