/**************************************
 *
 *  $
 *
 *  Copyright (c) 2019 Silverspex
 *
 *************************************/

'use strict';

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

module.exports = {
  listDrivesSync, type
};