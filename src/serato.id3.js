/* ***********************************************************************
 *
 *   Handle Serato ID3 tags
 *
 *   Most of the structures for the Serato data itself is based on the
 *   work of Holzhaus https://github.com/Holzhaus/serato-tags with some
 *   modifications on my part.
 *
 *   Copyright (c) 2020 Silverspex
 *
 * *********************************************************************/

'use strict';

const Color = require('./vdj.color');

function seratoId3(path, options = {}) {

  options = Object.assign({}, {
    sortCues: true
  }, options);

  const td = new TextDecoder('utf-8');
  const { getTags } = require('./getid3');
  const hdr = getTags(path);

  if ( hdr && hdr.tags ) {
    const seratoFrames = [];
    hdr.tags.forEach(tag => { // ID3v2.x etc.
      tag.frames.forEach(frame => {
        if ( frame.id === 'GEOB' ) {
          frame.buffer = new Uint8Array(tag.tag);
          seratoFrames.push(frame);
        }
        else if ( frame.id === 'TXXX' && frame.content.key === 'SERATO_PLAYCOUNT' ) {
          seratoFrames.push(frame);
        }
      })
    });

    const tags = [];

    seratoFrames
      .map(frame => frame.id === 'TXXX' ? frame : _decodeFrame(frame.buffer.subarray(frame.offset, frame.offset + frame.size)))
      .forEach(frame => {

        if ( !frame.description ) {
          tags.push({ type: 'playcount', count: frame.content.value | 0 });
        }
        else if ( frame.description === 'Serato Analysis' ) {
          tags.push({
            type   : 'version',
            version: +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`)
          })
        }

        else if ( frame.description === 'Serato Autotags' ) {
          const auto = td.decode(frame.data.subarray(2)).split('\0');
          tags.push({
            type    : 'autotags',
            version : +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`),
            bpm     : +auto[ 0 ],
            autoGain: +auto[ 1 ],
            db      : +auto[ 2 ]
          })
        }

        else if ( frame.description === 'Serato Offsets_' ) {
          // todo check how picky Serato is if this is not included in the tags
        }

        else if ( frame.description === 'Serato Markers_' ) {
          // todo check how picky Serato is if this is not included in the tags
          const data = frame.data;
          const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
          let markers = [];
          let pos = 2;

          const count = view.getUint32(pos);
          pos += 4;
          const unknown = view.getUint32(pos);
          pos += 4;

          //console.log(count, unknown);

          for(let i = 0; i < count; i++) {
            // 0:uin32 def. color
            pos += 22;
          }

          //console.log(pos === data.length);

          tags.push({
            type   : 'markers',
            version: +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`),
            markers
          })
        }

        else if ( frame.description === 'Serato Markers2' ) {
          // convert binary stored base64 string to string (! .. why, serato?)
          let base64 = Buffer
            .from(frame.data.buffer, frame.data.byteOffset + 2, frame.data.byteLength - 2)
            .toString();
          // base64 strings must be 4-byte aligned (! .. etc.) if invalid length, pad
          if ( base64.length % 4 !== 0 ) base64 += 'A'.padEnd((base64.length % 4) - 1, '=');

          // Now, convert back to binary format ...
          const bin = Buffer.from(base64, 'base64');
          const data = new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
          const view = new DataView(data.buffer, bin.byteOffset, bin.byteLength);
          let markers = [];
          let pos = 2;

          while( pos < data.length - 1 ) {
            const term = data.indexOf(0, pos);
            if ( term < 0 || term >= data.length ) break;

            const name = td.decode(data.subarray(pos, term));
            pos = term + 1;
            const len = view.getUint32(pos);
            pos += 4;

            //console.log(name, len);
            if ( name === 'COLOR' ) {
              markers.push({ type: 'color', color: new Color(view.getUint32(pos) | 0xff000000) }) // todo ! mask off alpha for all colors when exporting
            }
            else if ( name === 'BPMLOCK' ) {
              markers.push({ type: 'bpmlock', lock: !!data[ pos ] })
            }
            else if ( name === 'CUE' ) {
              const index = view.getUint16(pos);
              const position = view.getUint32(pos + 2) / 1000;
              const color = new Color(view.getUint32(pos + 6) | 0xff000000);
              const label = td.decode(data.subarray(pos + 12, pos + len - 1));
              markers.push({ type: 'cue', index, position, color, label })
            }
            else if ( name === 'LOOP' ) {
              const index = view.getUint16(pos);
              const start = view.getUint32(pos + 2) / 1000;
              const end = view.getUint32(pos + 6) / 1000;
              const color = new Color(view.getUint32(pos + 14) | 0xff000000);
              const locked = !!view.getUint8(pos + 18);
              const label = td.decode(data.subarray(pos + 19, pos + len - 1));
              markers.push({ type: 'loop', index, start, end, locked, color, label })
            }
            else if ( name === 'FLIP' ) {
              // these can be potentially be converted to VDJEdit files. Have no mp3s with flip stored though..

            }
            pos += len;

          }

          // sort CUEs by time
          if ( options.sortCues ) {
            markers = markers
              .filter(m => m.type === 'cue')
              .sort((a, b) => a.position > b.position ? 1 : (a.position < b.position ? -1 : 0))
              .map((m, i) => {
                m.index = i;
                return m
              })
              .concat(markers.filter(m => m.type !== 'cue'));
          }

          //console.log(markers);

          tags.push({
            type   : 'markers2',
            version: +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`),
            markers
          })
        }

        else if ( frame.description === 'Serato Overview' ) {
          tags.push({
            type    : 'waveform',
            version : +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`),
            waveform: [ ...frame.data.subarray(2) ].map(v => v << 4)
          })
        }

        else if ( frame.description === 'Serato BeatGrid' ) {
          const view = new DataView(frame.data.buffer, frame.data.byteOffset, frame.data.byteLength);
          const markers = [];
          let pos = 2;
          const count = view.getUint32(pos);
          pos += 4;
          for(let i = 0; i < count; i++) {
            if ( i === count - 1 ) {  // end marker
              const position = view.getFloat32(pos);
              pos += 4;
              const bpm = view.getFloat32(pos);
              pos += 4;
              markers.push({ position, bpm, count: -1 })
            }
            else {
              const position = view.getFloat32(pos);
              pos += 4;
              const beats = view.getUint32(pos);
              pos += 4;
              markers.push({ position, bpm: -1, beats })
            }
          }

          tags.push({
            type   : 'beatgrid',
            version: +(`${ frame.data[ 0 ] }.${ frame.data[ 1 ] }`),
            markers
          })
        }

      });

    // ... todo WIP

    return tags;

    function _decodeFrame(buffer) {
      let encoding;
      let type;
      let description;
      let data;
      let pos = 0;

      // content type
      encoding = buffer[ pos++ ];
      if ( encoding === 0 ) type = _extract();
      // else ... todo alt. encoding

      // description
      encoding = buffer[ pos++ ];
      if ( encoding === 0 ) description = _extract();

      if ( type === 'application/octet-stream' ) data = buffer.subarray(pos);

      function _extract() {
        let data = '';
        for(; pos < buffer.length; pos++) {
          const ch = buffer[ pos ];
          if ( ch === 0 ) break;
          data += String.fromCharCode(buffer[ pos ])
        }
        pos++;  // skip null term.
        return data
      }

      return { type, description, data }
    }
  }
}

module.exports = seratoId3;