/**************************************
 *
 *  Color object
 *
 *  Copyright (c) 2019 Epistemex
 *
 *************************************/

'use strict';

function Color(color) {
  const argb = color >>> 0;
  this.r = argb >>> 16 & 0xff;
  this.g = argb >>> 8 & 0xff;
  this.b = argb & 0xff;
  this.a = argb >>> 24;
  this.color = color;
}

Color.prototype = {
  toNumber: function() {
    return ((this.a & 0xff) << 24 | (this.r & 0xff) << 16 | (this.g & 0xff) << 8 | (this.b & 0xff)) >>> 0;
  },

  toString: function() {
    return '' + this.toNumber();
  }
};

module.exports = Color;
