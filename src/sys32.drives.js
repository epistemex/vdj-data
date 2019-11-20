/**************************************
 *
 *  Drives (Windows)
 *
 *  Copyright (c) 2018-2019 Silverspex
 *
 *************************************/

'use strict';

const { exec, execSync } = require('child_process');

const _validFilters = [
  'Access', 'Availability', 'BlockSize', 'Caption', 'Compressed', 'ConfigManagerErrorCode', 'ConfigManagerUserConfig',
  'CreationClassName', 'Description', 'DeviceID', 'DriveType', 'ErrorCleared', 'ErrorDescription', 'ErrorMethodology',
  'FileSystem', 'FreeSpace', 'InstallDate', 'LastErrorCode', 'MaximumComponentLength', 'MediaType', 'Name', 'NumberOfBlocks',
  'PNPDeviceID', 'PowerManagementCapabilities', 'PowerManagementSupported', 'ProviderName', 'Purpose', 'QuotasDisabled',
  'QuotasIncomplete', 'QuotasRebuilding', 'Size', 'Status', 'StatusInfo', 'SupportsDiskQuotas', 'SupportsFileBasedCompression',
  'SystemCreationClassName', 'SystemName', 'VolumeDirty', 'VolumeName', 'VolumeSerialNumber'
];

const _filterTypes = [ // 0=number, 1=boolean, 2=string, 3=datetime
  0, 0, 0, 2, 1, 0, 1, 2, 2, 2, 0, 1, 2, 2, 2, 0, 3, 0, 0, 0, 2, 0, 2, 0, 1, 2, 2, 1, 1, 1, 0, 2, 0, 1, 1, 2, 2, 1, 2, 2
];

/**
 * Valid drive types.
 * @readonly
 * @enum {number}
 * @ignore
 */
const type = {
  removable: 2,
  local    : 3,
  network  : 4,
  compact  : 5,
  ram      : 6
};

const _exeOptions = {
  windowsHide: true,
  timeout    : 10000,
  maxBuffer  : 1 << 22
};

/**
 * Generic callback
 * @callback DrivesCallback
 * @param {string|null} err - Error string or null if no error.
 * @param {Array.<*>} [result] - Array with objects. Each object and its
 * properties represents a single drive of the type given.
 * @ignore
 */

/**
 * @typedef {*} DrivesOptions
 * @prop {Array.<string>} [filters] - custom filters list. Note that filter names here
 * may be case-insensitive (the result however will contain strict naming).
 * See {@linkcode listFilters} for fields that may be used. Invalid fields are ignored.
 * An empty filter list will list all properties.
 * @prop {number} [timeout=10000] timeout (in milliseconds) for the querying process.
 * @ignore
 */

/* *****************************************************************************
  PRIVATE METHODS
*******************************************************************************/

/**
 *
 * @param type
 * @param options
 * @returns {string[]}
 * @private
 */
function _validate(type, options) {
  const hasOptions = options && typeof options === 'object';
  let filters = [ 'Description', 'DeviceID', 'FreeSpace', 'ProviderName', 'Size' ];

  type |= 0;
  if ( type < 2 || type > 6 ) throw 'Invalid type';

  // Strict validation of options but allow case-insensitive filter names
  if ( hasOptions ) {
    if ( Array.isArray(options.filters) ) {
      let ciList = _validFilters.map(value => value.toLowerCase());
      filters = options.filters.filter(value => ciList.indexOf(('' + value).toLowerCase()) > -1);
    }

    if ( !isNaN(options.timeout) ) {
      _exeOptions.timeout = Math.max(0, Math.min(60000, options.timeout | 0));
    }
  }

  return filters;
}

function _parser(err, stdout, callback) {
  if ( err ) callback(_parseError(err));
  else {
    // parse output
    let inSection = false;
    let section = {};
    let rxSplit = /=(.*)/;
    const result = [];

    stdout.split('\r\n').forEach(line => {
      line = line.trim();

      // new section?
      if ( !inSection && line.length ) {
        inSection = true;
      }

      // Analyze line if in section
      if ( inSection ) {
        if ( line.length ) {
          let kv = line.split(rxSplit, 2);
          let i = _validFilters.indexOf(kv[ 0 ]);   // -1 should never happen (pre-validation)
          let type = _filterTypes[ i ];
          section[ kv[ 0 ] ] = !type ? +kv[ 1 ] : (type === 1 ? kv[ 1 ] === 'TRUE' : kv[ 1 ].trim());
        }
        // end of section?
        else {
          inSection = false;
          result.push(section);
          // init new section (if any)
          section = {};
        }
      }
    });
    // DEC: since wmic always seem to have empty lines at the end we don't need to check for end of last section here

    // Done
    return callback ? callback(null, result) : result;
  }
}

function _parseError(err) {
  let msg = err.message;
  if ( msg.startsWith('Command failed') ) {
    msg = msg.includes('Invalid query') ? 'Invalid query' : 'wmic command missing?';
  }
  return msg;
}

function _getExe(type, options) {
  const filters = _validate(type, options);
  return `wmic path Win32_LogicalDisk Where DriveType="${ type }" get ${ filters.sort().join(',') } /VALUE`;
}

/* *****************************************************************************
  PUBLIC METHODS
*******************************************************************************/

/**
 * List drives based on types and optionally field list.
 * @param {number} type - type of device to list (see Drives.type enumerator).
 * @param {DrivesOptions} [options] - options.
 * @param {DrivesCallback} callback - result or error (err, result, type).
 * @async
 * @ignore
 */
function list(type, options, callback) {
  // todo promise-ify calls
  exec(_getExe(type, options), _exeOptions, (err, stdout) => {
    _parser(err, stdout, callback ? callback : options);
  });
}

/**
 * List drives based on types and optionally field list.
 * @param {number} type - type of device to list (see Drives.type enumerator)
 * @param {DrivesOptions} [options]
 * @returns {Array.<*>} - Array with objects. Each object and its properties represents a single drive of the type given
 * @ignore
 */
function listSync(type, options) {
  try {
    return _parser(null, '' + execSync(_getExe(type, options), Object.assign(_exeOptions, { stdio: 'pipe' })));
  }
  catch(err) {
    throw _parseError(err);
  }
}

/**
 * Get an array containing all valid fields
 * that can be queried with DrivesOptions.filters.
 * @returns {string[]}
 * @ignore
 */
function listFilters() {
  return _validFilters.concat();
}

module.exports = { list, listSync, listFilters, type };
