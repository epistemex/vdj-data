/**************************************
 *
 *  XML handling
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const fs = require('fs');
const Database = require('./vdj.database');
const utils = require('./utils');

/**
 * Parses playlist specific tag chain
 * @param {string} xml - tag string to parse
 * @returns {*} - JSON representing tags as keys and content as value
 * @ignore
 */
function parseTags(xml) {
  const result = {};
  const stack = [];
  let textStart = 0;
  let start = xml.indexOf('<');
  if ( start < 0 ) return {};

  while( start >= 0 ) {
    const end = xml.indexOf('>', start + 1);
    if ( end >= 0 ) {
      const tag = xml.substring(start + 1, end);
      const isClosing = tag[ 0 ] === '/';
      if ( isClosing ) {
        let txt = xml.substring(textStart, start).replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        result[ stack[ 0 ] ] = isNaN(/**@type {*}*/ txt) ? txt : +txt;
        stack.pop();
      }
      else {
        stack.push(tag);
        textStart = end + 1;
      }
    }
    else break;

    start = xml.indexOf('<', start + (end - start));
  }

  return result;
}

/**
 * Compile simple JSON for key-value content into tags string.
 * @param {*} json - JSON to compile
 * @returns {string}
 * @ignore
 */
function compileTags(json) {
  const xml = [];
  Object.keys(json).forEach(key => {
    const str = json[ key ];
    xml.push('<' + key + '>' + str.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</' + key + '>');
  });
  return xml.join('');
}

/**
 * Custom tailor made VDJ XML parser (more than 2x faster than fast-xml-parser).
 * @param {string} path - path to database.xml -OR- XML as string
 * @returns {null|Database}
 * @ignore
 */
function parseDatabaseXML(path) {
  const xml = path.includes('<') ? path : fs.readFileSync(path, 'utf-8');
  const db = new Database(null, path);
  const stack = [];
  let song = null;
  let commentStart = 0;
  let customStart = 0;
  let start = xml.indexOf('<');
  if ( start < 0 ) return null;

  while( start >= 0 ) {
    // get TAG
    const start1 = start + 1;
    const end = xml.indexOf('>', start1);
    const selfClosing = xml[ end - 1 ] === '/';
    const tag = xml.substring(start1, end - (selfClosing ? 1 : 0));
    const isClosing = tag[ 0 ] === '/';

    // get TAG NAME
    let tagNameEnd = tag.indexOf(' ');
    if ( tagNameEnd < 0 ) tagNameEnd = end;
    const tagName = tag.substring(isClosing ? 1 : 0, tagNameEnd);

    // update tag STACK and validity
    if ( !selfClosing && !isClosing ) stack.push(tagName);
    else if ( isClosing && tagName !== stack.pop() ) throw 'XML structure error.';

    // Close up Song
    if ( isClosing && tagName === 'Song' ) {
      if ( song ) db.songs.push(new Database.Song(song));
    }
    // Start Song
    else if ( !isClosing && tagName === 'Song' ) {
      // initialize new Song instance
      song = { Tags: {}, Infos: {}, Scan: {}, Poi: [], Link: {} };
      const attrs = _getAttrs(tagName, tag);
      const size = attrs[ 'FileSize' ] || 0;
      song.FilePath = utils.fromEntities(attrs[ 'FilePath' ] || '');
      if ( size && !isNaN(size) ) song.FileSize = size;
      song.Flag = attrs[ 'Flag' ];
    }
    // Scan TAGS
    else if ( selfClosing ) {
      if ( tagName === 'Poi' ) {
        const attrs = _getAttrs(tagName, tag);
        if ( attrs ) song.Poi.push(attrs);
      }
      else {
        song[ tagName ] = _getAttrs(tagName, tag);
      }
    }
    else if ( !selfClosing ) {
      // Scan Comment
      if ( !isClosing && tagName === 'Comment' ) {
        commentStart = start + 9;
      }
      // Scan End Comment
      else if ( isClosing && tagName === 'Comment' ) {
        song.Comment = utils.fromEntities(xml.substring(commentStart, start));
      }
      // Scan CustomMix
      else if ( !isClosing && tagName === 'CustomMix' ) {
        customStart = start + 11;
      }
      // Scan End CustomMix
      else if ( isClosing && tagName === 'CustomMix' ) {
        song.CustomMix = utils.fromEntities(xml.substring(customStart, start));
      }
    }
    // Scan ROOT
    else if ( !isClosing && tagName === 'VirtualDJ_Database' ) {
      const attrs = _getAttrs(tagName, tag);
      db.version = attrs.Version || '8.4';
      db.versionNum = db._getNumVersion(this.version);
    }

    start = xml.indexOf('<', end + 1);
  }

  function _getAttrs(tagName, tag) {
    const attrs = {};
    let start = tag.indexOf(' ', tagName.length);
    while( start > 0 ) {
      const eq = tag.indexOf('=', start);
      const end = tag.indexOf('"', eq + 2);
      if ( eq < 0 || end < 0 ) break;

      const key = tag.substring(start + 1, eq).trim();
      const value = tag.substring(eq + 2, end);
      attrs[ key ] = utils.fromEntities(value);

      start = tag.indexOf(' ', end);
    }
    return attrs;
  }

  return db;
}

module.exports = {
  parseDatabaseXML, parseTags, compileTags
};
