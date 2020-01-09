/**************************************
 *
 *  sys utils
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

const Path = require('path');
const drives = require('./sys32.drives');
const { execFileSync } = require('child_process');

/* *****************************************************************************
  REGISTRY
*******************************************************************************/

/**
 * Get Windows registry values based on given key.
 * @param {string} key - Key path, i.e "HKCU\Software\someKey".
 * @returns []
 * @ignore
 */
function getRegSync(key) {
  let result = [];

  try {
    const reg = _execSync('reg', [ 'query', key ]);
    result = reg ? _filterReg('' + reg) : [];
  }
  catch(err) {
    debug(err);
  }

  function _filterReg(result) {
    return result
      .replace(/\r/gm, '')
      .split('\n')
      .filter(line => line.startsWith('    '))
      .map(line => line.trim().split('    '));
  }

  return result;
}

function getAudioFingerprint(audioPath, raw) {
  const exePath = Path.join(__dirname, `../bin/${ process.platform.replace(/[./\\~]/g, '') }/fpcalc.exe`);
  const args = [ '-json', audioPath ];
  if ( raw ) args.push('-raw');
  let json = null;
  try {
    json = JSON.parse(_execSync(exePath, args).toString());
    json.fingerprint = new Uint32Array(json.fingerprint);
  }
  catch {}
  return json;
}

function _execSync(cmd, args, timeout = 5) {
  try {
    return execFileSync(cmd, args, { timeout: timeout * 1000 });
  }
  catch {
    return null;
  }
}

/* *****************************************************************************
  LIST DRIVES
*******************************************************************************/

module.exports = {
  getRegSync,
  getAudioFingerprint,
  listDrivesSync: drives.listSync,
  driveType     : drives.type
};
