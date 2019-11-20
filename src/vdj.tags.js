/**************************************
 *
 *  Tags object in Song
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const utils = require('./utils');

/**
 * Instance of the Tags tag with normalized property names (JavaScript camel-case)
 * and type casting.
 * @param {*} [json] - optional Infos JSON from XML branch. If none an empty instance is created.
 * @constructor
 */
function Tags(json = {}) {
  this.artist = utils.toStr(json.Author);
  this.title = utils.toStr(json.Title);
  this.genre = utils.toStr(json.Genre);
  this.album = utils.toStr(json.Album);
  this.trackNumber = utils.toStr(json.TrackNumber);
  this.year = utils.toStr(json.Year);
  this.flags = utils.toStr(json.Flag);
  this.bpm = utils.toStr(json.Bpm);
  this.key = utils.toStr(json.Key);
  this.composer = utils.toStr(json.Composer);
  this.label = utils.toStr(json.Label);
  this.remix = utils.toStr(json.Remix);
  this.stars = utils.toStr(json.Stars);
  this.remixer = utils.toStr(json.Remixer);
  this.grouping = utils.toStr(json.Grouping);
  this.user1 = utils.toStr(json.User1);
  this.user2 = utils.toStr(json.User2);
  this.internal = utils.toStr(json.internal);
}

Tags.prototype = {
  /**
   * Convert instance to JSON representation with database property names.
   * @returns {*}
   */
  toJSON: function() {
    const json = {};
    if ( this.artist !== null ) json.Author = utils.fromStr(this.artist);
    if ( this.title !== null ) json.Title = utils.fromStr(this.title);
    if ( this.genre !== null ) json.Genre = utils.fromStr(this.genre);
    if ( this.album !== null ) json.Album = utils.fromStr(this.album);
    if ( this.composer !== null ) json.Composer = utils.fromStr(this.composer);
    if ( this.label !== null ) json.Label = utils.fromStr(this.label);
    if ( this.remix !== null ) json.Remix = utils.fromStr(this.remix);
    if ( this.remixer !== null ) json.Remixer = utils.fromStr(this.remixer);
    if ( this.trackNumber !== null ) json.TrackNumber = utils.fromStr(this.trackNumber);
    if ( this.grouping !== null ) json.Grouping = utils.fromStr(this.grouping);
    if ( this.year !== null ) json.Year = utils.fromStr(this.year);
    if ( this.bpm !== null ) json.Bpm = utils.fromStr(this.bpm);
    if ( this.key !== null ) json.Key = utils.fromStr(this.key);
    if ( this.stars !== null ) json.Stars = utils.fromStr(this.stars);
    if ( this.user1 !== null ) json.User1 = utils.fromStr(this.user1);
    if ( this.user2 !== null ) json.User2 = utils.fromStr(this.user2);
    if ( this.flags !== null ) json.Flag = utils.fromStr(this.flags);
    if ( this.internal !== null ) json.internal = utils.fromStr(this.internal);

    return json;
  },

  /**
   * Convert instance to XML representation.
   * @returns {string}
   */
  toXML: function() {
    const xml = [];
    if ( this.artist ) xml.push(`Author="${ utils.toEntities(this.artist) }"`);
    if ( this.title ) xml.push(`Title="${ utils.toEntities(this.title) }"`);
    if ( this.genre ) xml.push(`Genre="${ utils.toEntities(this.genre) }"`);
    if ( this.album ) xml.push(`Album="${ utils.toEntities(this.album) }"`);
    if ( this.composer ) xml.push(`Composer="${ utils.toEntities(this.composer) }"`);
    if ( this.label ) xml.push(`Label="${ utils.toEntities(this.label) }"`);
    if ( this.remix ) xml.push(`Remix="${ utils.toEntities(this.remix) }"`);
    if ( this.remixer ) xml.push(`Remixer="${ utils.toEntities(this.remixer) }"`);
    if ( this.trackNumber ) xml.push(`TrackNumber="${ utils.toEntities(this.trackNumber) }"`);
    if ( this.grouping ) xml.push(`Grouping="${ utils.toEntities(this.grouping) }"`);
    if ( this.year ) xml.push(`Year="${ utils.toEntities(this.year) }"`);
    if ( this.stars ) xml.push(`Stars="${ utils.toEntities(this.stars) }"`);
    if ( this.user1 ) xml.push(`User1="${ utils.toEntities(this.user1) }"`);
    if ( this.user2 ) xml.push(`User2="${ utils.toEntities(this.user2) }"`);
    if ( this.bpm ) xml.push(`Bpm="${ parseFloat(this.bpm).toFixed(6) }"`);
    if ( this.key ) xml.push(`Key="${ utils.toEntities(this.key) }"`);
    if ( this.flags ) xml.push(`Flag="${ utils.toEntities(this.flags) }"`);
    if ( this.internal ) xml.push(`Internal="${ utils.toEntities(this.internal) }"`);

    return xml.length ? `  <Tags ${ xml.join(' ') } />` : '';
  }
};

module.exports = Tags;
