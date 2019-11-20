/**************************************
 *
 *  VDJSample object
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const fs = require('fs');

function VDJSample(path) {
  const buffer = fs.readFileSync(path);
  // magic = 0x56444A00

}

VDJSample.prototype = {};

module.exports = VDJSample;
