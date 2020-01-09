/**************************************
 *
 *  Cleaner (filenames)
 *
 *  Copyright (c) 2019-2020 Silverspex
 *
 *************************************/

'use strict';

const utils = require('./utils');
const _esc = r => r.replace(rxEsc, '\\$&');

const thisYear = (new Date).getFullYear();

const rxDotWords = /\w{3,}[^\s]\.?[^\s]\w{3,}/g;
const rxEsc = /[-\/\\^$*+?.()|[\]{}]/g;
const rxUC = /\b(dj|pvp|bmp|emf|tlc|tv|abba|acdc|uk|hd|sd|hq|uhd|am|pm)\b/gi;
const rxLC = /\b(van|a-ha)\b/gi;
const rxRU = /\b(uk|us)\b/gi;
const rxForce = /\b(official|de|stereo)\b/i;
const rxForceCap = /\b(music|video|the)\b/i;
const rxRemove = /\b(hd|hq|hiq|sd)\b/i;
const rxExt = /\.wmv|\.mp3|\.wav|\.flac|\.aac|\.mp4|\.wma|\.m4a/i;
const rxRMX = /\b(remix|edit|mix|version|versions|cut|radio|bootleg|mashup|mash-up|original|extended|live|treatment|club|12"|7"|inch|lp|album|rework|re-lift|relift|single|ep|remaster|45|33|acapella|accapella|demo|uplifting|touch|official)\b/i;
const rxWS = /\s\s+/g;
const rxIChars = /[<>":*\/|?_]|\s\s+/g;
const rxNumStart = /^\d+[^ ]/;
const rxApos = /'Ll |'Ve |'T |'S |'M|'Re|'N /g;

const defOptions = {
  'featuring' : 'ft.',
  'presents'  : 'pres.',
  'versus'    : 'vs',
  'and'       : ' & ',
  format      : '%artist %presents %featuring - %title (%remix)',
  artists     : 'smart',  /* all, smart, first */
  titleFromPar: true,
  capitalize  : false,
  threshold   : 5,
  keepYear    : true
};

function parse(s, options) {
  options = Object.assign({}, defOptions, options);

  const o = {
    cleaned  : null,
    original : s,
    artists  : [],
    title    : '',
    remix    : null,
    year     : null,
    featuring: null,
    presents : null
  };

  const replaces = {
    'features': { keywords: [ 'featuring', 'feature', 'feat.', 'feat', 'ft.', 'ft' ], target: options.featuring, cs: false, global: true },
    'presents': { keywords: [ 'presents', 'present', 'pres.', 'pres', 'pr.', 'pr' ], target: options.presents, cs: false, global: true },
    'versus'  : { keywords: [ 'versus', 'vs.', 'vs' ], target: options.versus, cs: false, global: true },
    'and'     : { keywords: [ ' and ', ' x ', ' y ', ' + ' ], target: options.and, cs: false, global: true }
  };

  const replKeys = Object.keys(replaces);

  let misc = [];

  /* ---------------------------------------------------------------------------
    SPECIAL CASES ** BEFORE ** CLEANING UP CHARS AND WS
  ----------------------------------------------------------------------------*/

  // remove extensions if any
  s = s.replace(rxExt, '');

  // decode entities
  const amp = s.indexOf('&');
  if ( amp >= 0 && s.indexOf(';', amp) > 0 ) s = utils.fromEntities(s);

  // entity and misc cleanup
  s = s.replace(/amp;/g, '');

  // special case: words combined with dot
  s = s.replace(rxDotWords, w => {
    if ( w.includes('.') ) return w.replace('.', ' - ');
    return w;
  });

  // special case: no separators? check if mostly single chars, replace 2-3 spaces with dash
  const spaces = _spaces(s);
  //if ( spaces.more && !s.includes('-') && !s.includes('(') ) {
  if ( spaces.more && !/[^\s]-[^\s]/g.test(s) && !s.includes('(') && /^.*\s\s+[^-(]*$/.test(s) ) {
    let hasDash = s.includes(' - ');
    let sc = 0;
    s = s.replace(rxWS, w => {
      sc++;
      if ( sc === 1 ) return hasDash ? ' (' : ' - ';
      else if ( sc === 2 ) return ' (';
      else return w;
    });
    if ( sc > 1 || (sc === 1 && hasDash) ) s += ')';
  }

  // special case: parenthesis is double or more spaces
  if ( spaces.one > 3 && spaces.more === 1 && !s.includes('(') && /^.*\s\s+[^-(]*$/.test(s) ) {
    const iSpace = s.indexOf('  ');
    const iDash = s.indexOf(' - ');
    if ( iDash < 0 || (iSpace > iDash) ) {
      s = s.replace('  ', ' - ');
    }
  }

  // special case: words separated by dash
  if ( _count(s, '-') > 3 ) {
    s = s.replace(/-/g, ' ');
  }

  // special case double underline __ represents (
  if ( s.includes('__') && !s.replace('__', ' ').includes('_') ) {
    const p = s.indexOf('__');
    if ( rxRMX.test(s.substr(p)) ) {
      s = s.replace(/__/g, ' - ');
      //      s = s.replace(/__/, ' )');
      //      if (s.indexOf(')', p + 1) < 0) s += ')';
    }
  }

  // normalize chars and whitespace
  s = s
    .replace(rxNumStart, '')
    .replace(rxIChars, ' ')
    .replace(/\[/g, '(')
    .replace(/]/g, ')')
    .replace(/–/g, '-')
    .replace(/[),]/g, '$& ')
    .replace(/;/g, ', ')
    // A - Xxx.. -> A-Xxx..
    .replace(/^\w?\s-\s/, w => w.replace(/\s/g, ''))
    // ..xxx-1997 -> ..xxx (1997)
    .replace(/[-]\d{4}$/, w => ' (' + w.substr(1) + ')')
  ;

  /* ---------------------------------------------------------------------------
    SPECIAL CASES ** AFTER ** CHARS AND WS CLEANUP
  ----------------------------------------------------------------------------*/

  // remove words
  s = s.replace(rxRemove, ' ');

  // normalize artists - title sep.
  const seps = _count(s, '-');
  if ( seps === 1 && !s.includes(' - ') ) s = s.replace(/-/, ' - ');
  else if ( seps > 1 && !s.includes(' - ') ) {
    const tmp = s.split('(')[ 0 ];
    const sep = tmp.lastIndexOf('-');
    s = s.substr(0, sep) + ' - ' + s.substr(sep + 1);
  }

  s = _normalize(s, options);

  // detect " - " inside parenthesise
  s = s.replace(/\(([^)]+)\)/g, w => w.replace(/\s-\s/g, ' '));

  // replace and normalize special keywords (featuring, pres., and etc.)
  replKeys.forEach(key => {
    const branch = replaces[ key ];
    const words = branch.keywords;
    const target = branch.target;
    let flags = branch.cs ? '' : 'i';
    if ( branch.global ) flags += 'g';
    const rx = new RegExp(`\\b(${ words.map(f => _esc(f)).join('|') })\\b`, flags);
    s = s.replace(rx, target).replace(/\.\./g, '.');
  });

  // special case: scan for double features todo change to replace()?
  const _ft = ` ${ options.featuring } `;
  const i1 = s.indexOf(_ft);
  const i2 = i1 >= 0 ? s.indexOf(_ft, i1 + _ft.length) : 0;
  const sa = s.split('');
  if ( i2 > 0 ) {
    const diff = i2 - i1;
    for(let i = i1; i < i2; i++) {
      const c1 = s[ i ];
      const c2 = s[ i + diff ];
      if ( c1 === c2 ) sa[ i + diff ] = ' ';
    }
    s = sa.join('').replace(rxWS, ' ');
  }

  /* ---------------------------------------------------------------------------
    PARSING EACH PART
  ----------------------------------------------------------------------------*/

  // split
  const parts = [];
  s.split(' - ').filter(p => p.length).forEach((segment, i) => {
    if ( i ) {
      parts.push(...(segment
        .split(/ - |\(|\)/g)
        .map(p => p.trim())
        .filter(p => p.length))
      );
    }
    else parts.push(segment);
  });

  // special case when no title is present:
  const ip = s.indexOf('(');
  const hasTitle = s.substr(0, ip > 0 ? ip : s.length);
  if ( !hasTitle.includes('-') ) {
    parts.splice(1, 0, '<<');
  }

  function _getSub(part, sub) {
    const result = { part, sub: null };
    const i = part.indexOf(sub);
    if ( i >= 0 ) {
      result.sub = part.substr(i + sub.length).trim();
      result.part = part.substr(0, i).trim();
      return result;
    }
    return null;
  }

  // clean each part
  parts.forEach((p, i) => {
    let used = false;

    // get featuring
    const ft = _getSub(p, options.featuring);
    if ( ft ) {
      p = ft.part;
      o.featuring = ft.sub.split('@')[ 0 ].replace(/^[.]/, '').trim();
      if ( !o.featuring.length ) {
        misc.push(o.featuring);
        o.featuring = null;
      }
      used = i < 1;
    }

    // get presents
    const pr = _getSub(p, options.presents);
    if ( pr ) {
      p = pr.part;
      o.presents = pr.sub;
      o.artists.push(p);
      used = true;
    }

    if ( i === 0 ) {
      o.artists = p.split(/[,;]/g)
        .map(p => {
          return p
            .replace(/\bwith\b/gi, options.and)
            .replace(rxWS, ' ')
            .trim();
        })
        .filter(a => a.length);
      used = true;
    }
    else if ( i > 1 ) {
      if ( isNaN(p) ) {
        // remix?
        if ( !o.remix && rxRMX.test(p) ) {
          o.remix = p;
          used = true;
        }
      }
      else {
        const n = p | 0;
        if ( n >= 1860 && n <= thisYear ) {
          o.year = p;
          used = true;
        }
      }
    }

    if ( !used ) misc.push(p);
  });

  // build title from misc parts
  const tParts = s.split(' - ');
  const oTitle = (tParts[ tParts.length - 1 ] || '').toLowerCase();
  if ( o.remix ) {
    const oStr = o.original.toLowerCase();
    misc = misc.filter(m => !oStr.endsWith(' - ' + m.toLowerCase()) && !(m.length > 2 && m.startsWith('-')));
  }

  /* ---------------------------------------------------------------------------
    POST CLEANUP
  ----------------------------------------------------------------------------*/

  misc.forEach(p => {
    const usePar = oTitle.includes(`(${ p.toLowerCase() })`);
    o.title += usePar ? ` (${ p })` : ` ${ p }`;
  });
  o.title = o.title.trim();

  // check title
  if ( o.title.startsWith('<<') ) {
    const title = o.title.substr(3);
    o.title = title.length ? (options.titleFromPar ? title : `(${ title })`) : null;
  }

  // remove featuring./pres. from artists list
  const fList = [];
  if ( o.featuring ) fList.push(o.featuring.toLowerCase()); //.replace(/\W/g, ''));
  if ( o.presents ) fList.push(o.presents.toLowerCase()); //.replace(/\W/g, ''));
  if ( fList.length ) {
    const rxDbl = new RegExp(fList.map(f => _esc(f)).join('|'), 'gi');
    o.artists = o.artists.map(a => a.replace(rxDbl, '').trim()).filter(a => a.length);
  }

  // handle artist names with mix or starting with numbers
  let artist = o.artists[ 0 ] || '';
  //if ( /^[\d]+/.test(artist) ) {
  if ( rxNumStart.test(artist) ) {
    let tmp = artist;
    let i = artist.indexOf(` ${ options.versus } `);
    i = i > 0 ? i : artist.indexOf(` ${ options.and } `);
    if ( i > 0 ) tmp = tmp.substr(0, i);
    if ( tmp.split(' ').length > 2 ) {
      artist = artist.replace(/^[\d]+/, '').trim();
      o.artists[ 0 ] = artist;
    }
  }

  // handle remix
  if ( o.remix && o.remix.length ) {

  }

  // year 2. try
  if ( !o.year ) {

    // try two digits first ('00[Z])
    const y2 = /'(\d{2})/g;
    if ( o.artists[ 0 ] && y2.test(o.artists[ 0 ]) ) {
      o.artists[ 0 ] = o.artists[ 0 ].replace(y2, w => {
        const y = w.substr(1) | 0;
        const now = thisYear.toString().substr(2);
        if ( y < 0 || y > 99 ) return w;
        else if ( y >= 0 && y <= now ) {
          o.year = 2000 + y;
          return '';
        }
        else {
          o.year = 1900 + y;
          return '';
        }
      });
      o.artists[ 0 ] = o.artists[ 0 ].replace(/ Z/, '');
    }

    // replace 2-digit year with full year
    if ( o.title && y2.test(o.title) ) {
      o.title = o.title.replace(y2, w => {
        const y = w.substr(1) | 0;
        if ( y < 0 || y > 99 ) return w;
        else if ( y >= 0 && y <= thisYear.toString().substr(2) ) {
          return '20' + y;
        }
        else return '19' + y;
      });
    }

    s.split(/[ (]/g).forEach(p => {
      if ( !isNaN(p) ) {
        const n = p | 0;
        if ( n >= 1860 && n <= thisYear ) {
          o.year = n;
        }
      }
    });

    // remove year from parts
    if ( !options.keepYear && o.year ) {
      const _replYear = a => a.replace(o.year, ' ').replace(rxWS, ' ').trim();
      if ( o.artists.length ) o.artists = o.artists.map(_replYear);
      if ( o.title ) o.title = _replYear(o.title);
    }
  }

  // fix case artist
  if ( o.artists.length ) {
    o.artists = o.artists.map(a => a.replace(rxUC, w => w.toUpperCase()));
    o.artists = o.artists.map(a => a.replace(rxLC, w => w.toLowerCase()));
    o.artists = o.artists.map(a => a.replace(rxWS, ' '));

    // final cleanups
    o.artists[ 0 ] = _forceCap(o.artists[ 0 ].replace(/^[^\w\d]/, ''));
  }

  // special case: no title, just a "by"
  if ( !o.title && !o.remix && /by /i.test(o.artists[ 0 ]) ) {
    const parts = o.artists[ 0 ].split(/by /i);
    const rxBy = new RegExp(`by ${ _esc(parts[ 1 ]) }`, 'i');
    o.title = o.artists.join(' ').replace(rxBy, '').replace(/sung/i, ' ').trim();
    o.artists = [ _normalize(parts[ 1 ].trim(), options) ];
  }

  // fix case title
  if ( o.title && o.title.length ) {
    o.title = o.title.replace(rxUC, w => w.toUpperCase());
    o.title = o.title.replace(rxLC, w => w.toLowerCase());

    // misc. cleanups
    o.title = o.title.replace(', (', ' (');

    // embedded in parenthesis?
    o.title = o.title.replace(/^\(.*\)$/, w => w.length > 2 ? w.substring(1, w.length - 1) : w);

    // force parenthesis
    if ( !o.title.includes('(') && !o.title.includes(')') && rxForce.test(o.title) ) {
      const parts = o.title.split(rxForce);
      if ( parts.length > 1 ) {
        o.title = _normalize((parts[ 0 ] + ' (' + parts.splice(1).join(' ') + ')').replace(rxWS, ' '), options);
      }
    }

    o.title = _forceCap(o.title);
    o.title = o.title.replace(rxWS, ' ');

    // check if remix is in title
    if ( !o.remix && rxRMX.test(o.title) ) {
      o.remix = o.title;
      o.title = null;
    }
  }

  function _case(s) {
    return _forceCap(s.replace(rxUC, w => w.toUpperCase()).replace(rxLC, w => w.toLowerCase()));
  }

  // fix case features
  if ( o.features && o.features.length ) {
    o.features = _case(o.features);
  }

  // fix case presents
  if ( o.presents && o.presents.length ) {
    o.presents = _case(o.presents);
  }

  // upper case in remix
  if ( o.remix && o.remix.length ) {
    o.remix = _case(o.remix).replace(rxRU, w => w.toUpperCase());
  }

  // remove any remaining year in title
  if ( o.title ) {
    const result = /\b\d{4}\b|\(\d{4}\)/g.exec(o.title);
    if ( result && result.length && result[ 0 ] >= 1860 && result[ 0 ] <= thisYear ) {
      if ( !o.year ) o.year = result[ 0 ];
      o.title = o.title.replace(/\b\d{4}\b|\(\d{4}\)/g, '').trim();
    }
  }

  // swap title and remix?
  //  if (o.title && o.remix && rxRMX.test(o.title) && !rxRMX.test(o.remix)) {
  //    const tmp = o.title;
  //    o.title = o.remix;
  //    o.remix = tmp;
  //  }

  // todo add score (difference between cleaned and original version)

  // compile
  o.cleaned = compile(o, options);

  return o;
}

function compile(o, options) {
  let format = options.format;

  if ( format.includes('%artist') ) {
    const opt = options.artists;
    const artists = o.artists || [];

    if ( opt === 'all' ) {
      format = format.replace('%artist', artists.join(` ${ options.and } `));
    }
    else if ( opt === 'smart' && artists.length > 1 && artists.length < 4 && artists[ 0 ].length < 20 && artists[ 1 ].length < 16 ) {
      // todo consider using string length as a factor (loop down)
      format = format.replace('%artist', artists.slice(0, 2).join(` ${ options.and } `));
    }
    else {
      format = format.replace('%artist', artists[ 0 ] || '');
    }
  }

  if ( format.includes('%featuring') ) {
    format = format.replace('%featuring', o.featuring ? `${ options.featuring } ${ o.featuring || '' }` : '');
  }

  if ( format.includes('%presents') ) {
    format = format.replace('%presents', o.presents ? `${ options.presents } ${ o.presents || '' }` : '');
  }

  if ( format.includes('%title') ) {
    format = format.replace('%title', o.title || '');
  }

  if ( format.includes('%remix') ) format = format.replace('%remix', o.remix || '');
  if ( format.includes('%year') ) format = format.replace('%year', o.year || '');

  //if ( (!o.title && format.includes(' - ')) || (o.title && o.title.startsWith('(')) ) {
  if ( !o.title && format.includes(' - ') ) {
    format = format.replace(' - ', '');
  }

  return format
    .replace(/(\(\))|(\[])|( \. )/g, ' ') // empty par.
    .replace(rxWS, ' ')               // multiple spaces
    .replace(/[(\-[{}., ]*$/, '')          // ends in aqw,
    .trim();
}

function getTitle(o, options) {
  const opt = options.artists;
  if ( opt === 'all' ) {
    return o.artists.join(` ${ options.and } `);
  }
  else if ( opt === 'smart' && o.artists.length > 1 && o.artists.length < 4 && o.artists[ 0 ].length < 20 && o.artists[ 1 ].length < 16 ) {
    // todo consider using string length as a factor (loop down)
    return o.artists.slice(0, 2).join(` ${ options.and } `);
  }
  else {
    return o.artists[ 0 ] || null;
  }
}

function _count(str, char) {
  let count = 0;
  for(let c of str) if ( c === char ) count++;
  return count;
}

function _spaces(str) {
  const rx = /\s{1,}/gm;
  const result = { one: 0, more: 0 };
  let m;

  while( (m = rx.exec(str)) !== null ) {
    if ( m.index === rx.lastIndex ) rx.lastIndex++;
    m.forEach(w => {
      if ( w.length === 1 ) result.one++;
      else result.more++;
    });
  }

  return result;
}

function _normalize(str, options) {
  let newStr;

  if ( options.capitalize ) newStr = str.toLowerCase();
  else {
    newStr = str
      .split(' ')
      .map(p => !options.capitalize && options.threshold && p.length > options.threshold ? p[ 0 ] + p.substr(1).toLowerCase() : p)
      .join(' ');
  }

  newStr = newStr.split('');
  if ( newStr.length ) newStr[ 0 ] = newStr[ 0 ].toUpperCase();

  str.replace(/[ -.'(]/g, (w, i) => {
    if ( i < str.length - 2 ) newStr[ i + 1 ] = str[ i + 1 ].toUpperCase();
    return w;
  });

  return newStr.join('')
    .replace(rxApos, w => w.toLowerCase())
    .split(' ')
    .map(p => /\w+\d+|\d+\w+/.test(p) ? p.toUpperCase() : p)
    .join(' ');
}

function _forceCap(s) {
  return s.replace(rxForceCap, w => (w.length > 1) ? w[ 0 ].toUpperCase() + w.substr(1).toLowerCase() : w);
}

module.exports = { cleaner: parse, getTitle, defOptions, compile };