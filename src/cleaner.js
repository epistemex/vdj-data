/**************************************
 *
 *  Cleaner (filenames)
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

function Cleaner() {

}

Cleaner.prototype = {
  parse: function(filename) {

  },

  clean: function(rules) {

  }
};

/* -----------------------------------------------------------------------------
  STATICS
----------------------------------------------------------------------------- */

Cleaner.ReplaceList = [
  { keywords: [ 'featuring', 'feature', 'feat', 'feat.', 'ft' ], target: 'ft.', cs: false },
  { keywords: [ 'presents', 'pres', 'pres.', 'pr', 'pr.' ], target: 'pres.', cs: false },
  { keywords: [ 'versus', 'vs' ], target: 'vs.', cs: false },
  { keywords: [ ' and ', ' x ', ' y ' ], target: ' & ', cs: false }
];

Cleaner.IsRemixList = [
  'remix', 'edit', 'mix', 'version', 'cut', 'radio', 'bootleg', 'mashup', 'mash-up', 'original',
  'extended', 'live', 'treatment', 'club', '12"', '7"', 'inch', 'lp', 'long', 'short', 'album',
  'rework', 're-lift', 'relift', 'single', 'ep'
];

Cleaner.UpperCaseList = [
  'emf', 'tlc', 'lmfao', 'makj', 'tv'
];

Cleaner.LowerCaseList = [
  'vs.'
];

Cleaner.NumberList = [
  '4 strings', '666', '2 pac'
];

module.exports = Cleaner;