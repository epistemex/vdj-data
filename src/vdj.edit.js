/**************************************
 *
 *  VDJEdit file object
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

function Edit(path) {
  const xml = path.includes('<') ? path : fs.readFileSync(path, 'utf8');

}

Edit.prototype = {
  toJSON: function() {},
  toXML : function() {}
};

module.exports = Edit;
