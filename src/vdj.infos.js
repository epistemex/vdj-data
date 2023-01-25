/**************************************
 *
 *  Infos object in Song
 *
 *  Copyright (c) 2019 Epistemex
 *
 *************************************/

'use strict';

const utils = require('./utils');
const Color = require('./vdj.color');

/**
 * Instance of the Infos tag with normalized property names (JavaScript camel-case)
 * and type casting.
 * @param {*} [json] - optional Infos JSON from XML branch. If none an empty instance is created.
 * @constructor
 */
function Infos(json) {
  json = Object.assign({}, json);
  this.songLength = utils.toFloat(json.SongLength);
  this.bitrate = utils.toInt(json.Bitrate);
  this.cover = utils.toInt(json.Cover);
  this.color = json.Color ? new Color(json.Color) : null;
  this.firstSeen = utils.toDate(json.FirstSeen);
  this.firstPlay = utils.toDate(json.FirstPlay);
  this.lastPlay = utils.toDate(json.LastPlay);
  this.playCount = utils.toInt(json.PlayCount);
  this.corrupted = utils.toBool(json.Corrupted);
  this.gain = utils.toFloat(json.Gain);
  this.userColor = json.UserColor ? new Color(json.UserColor) : null;
}

Infos.prototype = {
  /**
   * Convert instance to JSON representation with database property names.
   * @returns {*}
   */
  toJSON: function() {
    const json = {};
    if ( this.songLength ) json.SongLength = this.songLength.toString();
    if ( this.firstSeen ) json.FirstSeen = utils.fromDate(this.firstSeen).toString();
    if ( this.firstPlay ) json.FirstPlay = utils.fromDate(this.firstPlay).toString();
    if ( this.lastPlay ) json.LastPlay = utils.fromDate(this.lastPlay).toString();
    if ( this.playCount ) json.PlayCount = this.playCount.toString();
    if ( this.bitrate ) json.Bitrate = this.bitrate.toString();
    if ( this.userColor ) json.UserColor = this.userColor.toString();
    if ( this.color ) json.Color = this.color.toString();
    if ( this.cover ) json.Cover = this.cover.toString();
    if ( this.gain ) json.Gain = this.gain.toString();
    if ( this.corrupted ) json.Corrupted = utils.fromBool(this.corrupted);
    return json;
  },

  /**
   * Convert instance to XML representation.
   * @returns {string}
   */
  toXML: function() {
    const xml = [];
    if ( this.songLength ) xml.push(`SongLength="${ this.songLength.toFixed(6) }"`);
    if ( this.firstSeen ) xml.push(`FirstSeen="${ utils.fromDate(this.firstSeen) }"`);
    if ( this.firstPlay ) xml.push(`FirstPlay="${ utils.fromDate(this.firstPlay) }"`);
    if ( this.lastPlay ) xml.push(`LastPlay="${ utils.fromDate(this.lastPlay) }"`);
    if ( this.playCount ) xml.push(`PlayCount="${ this.playCount }"`);
    if ( this.bitrate ) xml.push(`Bitrate="${ this.bitrate }"`);
    if ( this.userColor ) xml.push(`UserColor="${ this.userColor.toString() }"`);
    if ( this.color ) xml.push(`Color="${ this.color.toString() }"`);
    if ( this.cover ) xml.push(`Cover="${ this.cover }"`);
    if ( this.corrupted ) xml.push(`Corrupted="${ this.corrupted }"`);

    return xml.length ? `  <Infos ${ xml.join(' ') } />` : '';
  }

};

module.exports = Infos;
