vdj-data
========

JavaScript and Node.js based scripting API for a variety of VirtualDJ data files.

Features
--------

- Databases:
    - Load, parse or create new database.xml files for VirtualDJ
    - Merge, split databases respecting ignoreDrives (Windows) and available drives
    - Search for songs by title, artist etc., or by file path
    - Verify song paths
    - Import, export, update using scripting
    - Export entire database and songs as XML or JSON
    - Create quick database backup snapshots before applying modifications.
- Songs:
    - Parse, add, remove Song objects
    - Load new songs from disk optionally including parsing tag information
    - Verify song path
    - Advanced filename cleaner (BETA)
    - Uses the Jaccard index algorithm to compare similarity between two song titles.
    - Extract tags from filename
    - Change and update any property (infos, tags, scan etc.)
    - Add, change or remove POIs
    - Extract every tag from a supported media file (cover art, user tags, native tags etc.)
    - Export song information as XML or JSON
- AcoustID
    - Produce AcoustID audio fingerprint for audio content independent of filename, type or encoding.
    - Compare audio fingerprints to find duplicate songs.  (WIP)
- Playlists
    - Load existing playlists (VDJ m3u)
    - Create new playlists
    - Modify playlist, add/remove songs
    - Validate song paths
    - Export new or modified playlists
- VDJSample:
    - Load VDJ samples
    - Extract and save out media data
    - Extract and save out thumb image (if present)
    - Change ranges, beatgrid, loop/drop modes etc.
    - Repair malformed samples (addresses VDJ specific bug).
    - Create new samples from scratch
    - Add or replace with almost any type of media (using ffmpeg)
    - Set PNG thumb image
    - Export with modifications
- Folders
    - (todo) create and modify virtual folders
    - (todo) create and modify filter folders
- CUE files:
    - Load and parse cue files
    - Convert to SRT, playlists for cloud services etc.
- Import/Export:
    - (WIP) Import Serato data from file tags
    - (todo) Export as Serato file tags
    - (todo) Import data from Mixxx
    - (todo) Export data to Mixxx
- System utilities (Windows only at the moment):
    - Get all drives with a VDJ database on them
    - Check if VirtualDJ is running.
- Backup, restore databases (as well as optionally settings, samples, plugins )
- Windows and MacOS (the latter does not enjoy full support at this time regarding auto-detection of
  paths etc., but should work on data level once loaded manually).

_Help keep the project alive by supporting the developer:_

[![PayPalMe](https://github.com/epistemex/transformation-matrix-js/assets/70324091/04203267-58f0-402b-9589-e2dee6e7c510)](https://paypal.me/KenNil)

Who Is This For?
----------------

If you want to make anything from simple scripts, which do one specific thing, to more complex
workflows and pipelines that combine online services, local conversion software, automatic tagging
and so forth, then this is for you!

You can alternatively use this package as a building block to make software handling VDJ data, and
you can easily build graphical front-ends using HTML and for example a local server, or Electron
etc.

Prerequisites
-------------

You need [Node.js](https://nodejs.org/en/) v12+ installed to use this package.
NPM (a package manager) comes as part of the installation.

Of course, you'd also need to know JavaScript as well as using Node.js and NPM.

It would be an advantage to have the VirtualDJ software installed unless you just
want to work with VDJ data files directly or make them from scratch.

If you want to create or replace `*.vdjsamples` with ***new media content***, then
[ffmpeg/ffprobe](https://ffmpeg.org/) is also required. See note in the linked
"sample" example below.

Install
-------

Run the following command in CLI to install this package into your project:

    npm i https://github.com/epistemex/vdj-data

Examples
--------

Getting started. After npm has finished installed this package, you can
`require()` the package into your .js file to use the vdj-data API:

```javascript
// Import and use in your projects
const vdj = require('vdj-data');

// The VDJ Data API can now be used ..
````

If you cloned the repo via git, or downloaded the zip/tar-ball, you would want to
import the `index.js` file instead. Just make sure the relative or absolute path
resolves to the `index.js` file:

```javascript
// Import from the demo folder would look like this
const vdj = require('../index');
````

**See these examples to get you started**

- [Using the Database object](examples/EXAMPLES-DATABASE.md)
- [Using the Song object](examples/EXAMPLES-SONGS.md)
- [Using the Playlist object](examples/EXAMPLES-PLAYLISTS.md)
- [Using the Sample object](examples/EXAMPLES-SAMPLE.md)
- [Using AcoustID audio fingerprinting](examples/EXAMPLES-FINGERPRINTING.md)
- [Using the Backup and Restore functions](examples/EXAMPLES-BACKUP-RESTORE.md)
- [System functions](examples/EXAMPLES-SYSTEM.md)

Demos
-----

The folder `demos/` contains some demo scripts to get you started. To run, open CLI,
"cd" to root folder and type:

    node demos\name-of-demo <args-if-any>

See content of each file for details.

Documentation
-------------

The package comes (eventually) with full API HTML documentation which you find
in the `docs/` folder.

Issues
------

NOTE: The development is currently in ALPHA. The API may change without prior
notice. Many features are not yet implemented. However, most of what you would
need to read, write and maintain database information is ready for use.

Known issues:

- Currently, system calls (detection of folder paths etc.) only works with Windows.
- Currently cannot detect if a _video_ file is a karaoke version (`database.loadSongAndTags()`)
- Since the project hasn't been updated since 2020 there might be new file features/data not covered
  by this current version. **Be careful when writing back XML files, for now.**

Feel free to use the issue tracker to [report issues](https://github.com/epistemex/vdj-data/issues),
feature requests.

License
-------

GPL 3.0

Disclaimer: this project is unofficial and not affiliated with Atomix.

© Epistemex 2019-2020, 2024
