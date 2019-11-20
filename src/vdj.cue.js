/**************************************
 *
 *  Cue object
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const fs = require('fs');

function Cue(path, databaseList) {
  // todo VDJ saves recorded tracks in the db with POIs for cue points.
  this.tracks = [];
  this.songs = [];
  this.duration = 0;

  try {
    this.parse(fs.readFileSync(path, 'utf-8'), databaseList);
  }
  catch(err) {
    debug(err);
    throw 'Could not load this CUE file.'; // todo throws inside catch...
  }
}

/* -----------------------------------------------------------------------------
  PROTOTYPE
----------------------------------------------------------------------------- */

Cue.prototype = {

  parse: function(file, dbs) {

    const lines = file.split('\n');
    const tracks = [];

    let track = null;
    let duration = 0;

    // Parse CUE file
    lines.forEach(fileLine => {
      const line = fileLine.trim();
      if ( line.startsWith('TRACK ') ) {
        if ( track ) tracks.push(track);
        track = {};
      }
      else if ( line.startsWith('TITLE ') ) {
        if ( track ) {  // track title
          track.title = line.substr(line.indexOf(' ') + 1).replace(/"/g, '');
        }
        else {  // top-level title. VDJ sets this to duration (although incorrectly..)
          duration = stamp2time(line.substr(line.lastIndexOf(' ') + 1).replace(/"/g, ''));
        }
      }
      else if ( track && line.startsWith('PERFORMER ') ) {  // track artist
        track.artist = line.substr(line.indexOf(' ') + 1).replace(/"/g, '');
      }
      else if ( track && line.startsWith('INDEX ') ) {  // time stamp (VDJ seem to always set last segment to 00...)
        track.time = stamp2time(line.substr(line.lastIndexOf(' ') + 1));
      }
    });

    // Push last parsed track
    if ( track ) tracks.push(track);

    this.duration = duration;
    this.tracks = tracks;

    //this.songs = vdj.lookupPaths(this.tracks.map(t => t.path), dbs);

    function stamp2time(st) {
      const segments = st.split(':').map(s => s | 0);
      if ( segments.length === 2 ) segments.push(0);
      if ( segments.length === 3 ) {
        return segments[ 0 ] * 60 + segments[ 1 ];
      }
      else if ( segments.length === 4 ) {
        return segments[ 0 ] * 3600 + segments[ 1 ] * 60 + segments[ 2 ];
      }
      else return 0;
    }
  }
};

module.exports = Cue;
