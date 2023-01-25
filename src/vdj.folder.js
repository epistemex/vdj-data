/**************************************
 *
 *  Folder object
 *
 *  Copyright (c) 2019 Epistemex
 *
 *************************************/

'use strict';

const fs = require('fs');

function Folder(path) {
  const xml = path.includes('<') ? path : fs.readFileSync(path, 'utf8');

}

Folder.prototype = {
  toJSON: function() {},
  toXML : function() {}
};

module.exports = Folder;
