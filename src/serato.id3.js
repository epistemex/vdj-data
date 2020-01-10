/* ***********************************************************************
 *
 *   Handle Serato ID3 tags
 *
 *   Copyright (c) 2020 Silverspex
 *
 * *********************************************************************/

'use strict';

const Color = require('./vdj.color');

function seratoId3(path) {
  const td = new TextDecoder('utf-8');
  const { getTags } = require('./getid3');
  const hdr = getTags(path);

  if ( hdr && hdr.tags ) {
    const seratoFrames = [];
    hdr.tags.forEach(tag => { // ID3v2.x etc.
      tag.frames.forEach(frame => {
        if ( frame.id === 'GEOB' || (frame.id === 'TXXX' && frame.content.key === 'SERATO_PLAYCOUNT') ) {
          if ( frame.id !== 'TXXX' ) frame.buffer = new Uint8Array(tag.tag);
          seratoFrames.push(frame);
        }
      })
    });

    const tags = [];

    seratoFrames
      .map(frame => frame.id === 'TXXX' ? frame : _decodeFrame(frame.buffer.subarray(frame.offset, frame.offset + frame.size)))
      .forEach(frame => {

        if ( !frame.description ) {
          tags.push({ type: 'playcount', count: frame.content.value });
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

        }

        else if ( frame.description === 'Serato Markers_' ) {

        }

        else if ( frame.description === 'Serato Markers2' ) {
          // convert binary base64 to string (! ..)
          let base64 = Buffer.from(frame.data.buffer, frame.data.byteOffset + 2, frame.data.byteLength - 2)
            .toString();
          if ( base64.length % 4 !== 0 ) base64 += 'A'.padEnd((base64.length % 4) - 1, '='); // invalid length, pad if needed

          // Now, convert back to binary format
          const bin = Buffer.from(base64, 'base64');
          const data = new Uint8Array(bin.buffer, bin.byteOffset, bin.byteLength);
          const view = new DataView(data.buffer, bin.byteOffset, bin.byteLength);
          const markers = [];
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
              markers.push({ type: 'color', color: new Color(view.getUint32(pos)) })
            }
            else if ( name === 'BPMLOCK' ) {
              markers.push({ type: 'bpmlock', lock: !!data[ pos ] })
            }
            else if ( name === 'CUE' ) {
              const index = view.getUint16(pos);
              const position = view.getUint32(pos + 2) / 1000;
              const color = new Color(view.getUint32(pos + 6));
              const label = td.decode(data.subarray(pos + 12, pos + len - 1));
              markers.push({ type: 'cue', index, position, color, label })
            }
            else if ( name === 'LOOP' ) {

            }
            else if ( name === 'FLIP' ) {

            }
            pos += len;

          }

          console.log(markers);
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
          const count = view.getUint32(pos, true);
          pos += 4;
          for(let i = 0; i < count; i++) {
            if ( i === count - 1 ) {  // end marker
              const position = view.getFloat32(pos, true);  // todo check endianess
              pos += 4;
              const bpm = view.getFloat32(pos, true);
              pos += 4;
              markers.push({ position, bpm, count: -1 })
            }
            else {
              const position = view.getFloat32(pos, true);
              pos += 4;
              const beats = view.getUint32(pos, true);
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

        else tags.push({ type: 'unknown', description: frame.description });
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