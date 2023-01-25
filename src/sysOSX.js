/**************************************
 *
 *  $
 *
 *  Copyright (c) 2019 Epistemex
 *
 *************************************/

'use strict';

const Path = require('path');
const { execFileSync } = require('child_process');

/**
 * Valid drive types.
 * @readonly
 * @enum {number}
 * @ignore
 */
const type = {
  /** Removable drives */
  removable: 2,
  /** Local hard-disks */
  local    : 3,
  /** Network mounted disks */
  network  : 4,
  /** Compact disks */
  compact  : 5,
  /** RAM disks */
  ram      : 6
};

function listDrivesSync() {

}

function _execSync(cmd, args, timeout = 5) {
  try {
    return execFileSync(cmd, args, { timeout: timeout * 1000 });
  }
  catch(err) {debug(err)}
  return null;
}

module.exports = {
  listDrivesSync,
  type,
};
