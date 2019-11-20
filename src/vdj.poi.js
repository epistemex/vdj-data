/**************************************
 *
 *  POI object
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const utils = require('./utils');
const Color = require('./vdj.color');

/**
 * POI object describing a single POI marker.
 * @param {*} [json] - JSON branch for this entry. If none is given an uninitialized instance is created.
 * @constructor
 */
function Poi(json = {}) {
  this.pos = utils.toFloat(json.Pos);
  this.type = utils.toStr(json.Type);
  this.phrase = utils.toInt(json.Phrase);
  this.point = utils.toStr(json.Point);
  this.name = utils.toStr(json.Name);
  this.num = utils.toInt(json.Num);
  this.bpm = utils.toBPM(json.Bpm);
  this.size = utils.toInt(json.Size);
  this.color = json.Color ? new Color(json.Color) : null;
  this.slot = utils.toInt(json.Slot);
}

/* -----------------------------------------------------------------------------
  PROTOTYPE
----------------------------------------------------------------------------- */

Poi.prototype = {
  /**
   * Convert instance to JSON representation with database property names.
   * @returns {*}
   */
  toJSON: function() {
    const json = {};
    if ( this.name ) json.Name = utils.fromStr(this.name);
    if ( utils.isNum(this.pos) ) json.Pos = this.pos.toString();
    if ( utils.isNum(this.num) ) json.Num = this.num.toString();
    if ( this.color ) json.Color = this.color.toString();
    if ( this.type ) json.Type = this.type;
    if ( this.phrase ) json.Phrase = this.phrase;
    if ( this.bpm ) json.Bpm = utils.fromBPM(this.num).toString();
    if ( this.point ) json.Point = this.point;
    if ( utils.isNum(this.size) ) json.Size = this.size.toString();
    if ( this.slot ) json.Slot = this.slot.toString();
    return json;
  },

  /**
   * Convert instance to XML representation.
   * @returns {string}
   */
  toXML: function() {
    const xml = [];
    if ( this.name ) xml.push(`Name="${ utils.toEntities(this.name) }"`);
    if ( utils.isNum(this.pos) ) xml.push(`Pos="${ this.pos.toFixed(6) }"`);
    if ( utils.isNum(this.num) ) xml.push(`Num="${ this.num }"`);
    if ( this.color ) xml.push(`Color="${ this.color.toString() }"`);
    if ( this.type ) xml.push(`Type="${ this.type }"`);
    if ( this.bpm ) xml.push(`Bpm="${ utils.fromBPM(this.bpm).toFixed(6) }"`);
    if ( this.phrase ) xml.push(`Phrase="${ this.phrase }"`);
    if ( this.point ) xml.push(`Point="${ this.point }"`);
    if ( utils.isNum(this.size) ) xml.push(`Size="${ this.size }"`);
    if ( this.slot ) xml.push(`Slot="${ this.slot }"`);
    return xml.length ? `  <Poi ${ xml.join(' ') } />` : '';
  }
};

/* -----------------------------------------------------------------------------
  STATICS
----------------------------------------------------------------------------- */

// Type ENUM
Poi.TYPE = {
  BEATGRID: 'beatgrid',
  AUTOMIX : 'automix',
  REMIX   : 'remix',
  CUE     : 'cue'
};

module.exports = Poi;
