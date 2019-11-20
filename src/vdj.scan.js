/**************************************
 *
 *  Scan object in Song
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const utils = require('./utils');

/**
 * Instance of the Scan tag with normalized property names (JavaScript camel-case)
 * and type casting.
 * @param {*} [json] - optional Infos JSON from XML branch. If none an empty instance is created.
 * @constructor
 */
function Scan(json = {}) {
  this.version = json.Version;
  this.flags = utils.toInt(json.Flag);
  this.volume = utils.toFloat(json.Volume);
  this.bpm = utils.toBPM(json.Bpm);
  this.altBpm = utils.toBPM(json.AltBpm);
  this.key = utils.toStr(json.Key);
}

Scan.prototype = {
  /**
   * Convert instance to JSON representation with database property names.
   * @returns {*}
   */
  toJSON: function() {
    const json = {};
    if ( this.version ) json.Version = this.version;
    if ( this.flags ) json.Flag = this.flags.toString();
    if ( this.volume ) json.Volume = this.volume.toString();
    if ( this.bpm ) json.Bpm = utils.fromBPM(this.bpm).toString();
    if ( this.altBpm ) json.AltBpm = utils.fromBPM(this.altBpm).toString();
    if ( this.key ) json.Key = this.key;
    return json;
  },

  /**
   * Convert instance to XML representation.
   * @returns {string}
   */
  toXML: function() {
    const xml = [];
    if ( this.version ) xml.push(`Version="${ this.version }"`);
    if ( this.bpm ) xml.push(`Bpm="${ utils.fromBPM(this.bpm).toFixed(6) }"`);
    if ( this.altBpm ) xml.push(`AltBpm="${ utils.fromBPM(this.altBpm).toFixed(6) }"`);
    if ( this.volume ) xml.push(`Volume="${ this.volume.toFixed(6) }"`);
    if ( this.key ) xml.push(`Key="${ this.key }"`);
    if ( this.flags ) xml.push(`Flag="${ this.flags }"`);
    return xml.length ? `  <Scan ${ xml.join(' ') } />` : '';
  }
};

module.exports = Scan;
