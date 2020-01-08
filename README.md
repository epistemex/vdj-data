vdj-data
========

JavaScript based scripting API for a variety of VirtualDJ data files.

Features
--------

- Databases:
    - Load, parse or create new database.xml files for VirtualDJ
    - Merge, split databases respecting ignoreDrives (Windows) and available drives
    - Search for songs by title, artist etc, or by file path
    - Verify song paths
    - Export as XML or JSON
    - Import, export, update using scripting
    - Remove duplicate paths
- Songs:
    - Parse, add, remove Song objects
    - Load new songs from disk optionally including parsing tag information
    - Verify song path
    - Change and update any property (infos, tags, scan etc.)
    - Add, change or remove POIs
    - Extract every tag from a supported media file (cover art, user tags, native tags etc.)
- AcoustID (WIP)
    - Produce AcoustID audio fingerprint for audio content independent of filename, type or encoding.
    - Compare audio fingerprints to find duplicate songs.
- Playlists
    - Load, update and create playlists (m3u)
    - Validate song paths
- VDJSample (WIP):
    - Load VDJ samples
    - Extract and save out media data
    - Extract and save out thumb image (if present)
    - Change ranges, beatgrid, loop/drop modes etc.
    - Repair malformed samples (addresses VDJ specific bug).
    - Create new samples from scratch
    - Add any supported media (via the free ffmpeg/ffprobe. See [ffmpeg.org](http://ffmpeg.org/))
    - Set PNG thumb image
    - Export with modifications
- Folders
    - (todo) create and modify virtual folders
    - (todo) create and modify filter folders
- CUE files:
    - Load and parse cue files
    - Convert to SRT, playlists for cloud services etc.
- Import/Export:
    - (todo) Import Serato data from file tags
    - (todo) Export as Serato file tags
- System utilities (Windows only at the moment):
    - Get all drives with VDJ database on them
    - Check if VirtualDJ is running.
- Backup, restore databases (as well as optionally settings, samples, plugins ) 
- Windows and MacOS (the latter does not enjoy full support at this time regarding
auto-detection of paths etc., but should work on data level once loaded manually).

You can use this from simple singleton scripts, or to make complex workflow and
pipelines (e.g. automatic file format conversion, chart list playlist creation,
file/folder organizing, mass custom tagging, metadata extraction and syncing,
interaction with external services and so forth).

This package can also be a building block to make software handling VDJ information.
You can easily build graphical front-ends using HTML and local server, or Electron etc.

It's free for your personal use (private or professionally). There are no obligations,
but feel free to consider [donating](https://issuehunt.io/r/silverspex/vdj-data) to the
project to keep it going.

Prerequisites
-------------

You need [Node.js](https://nodejs.org/en/) v12+ installed for this package (it 
may work with older versions, but this has not been tested).

It is assumed you're already familiar with how Node.js and NPM works if you plan
to integrate this package with your software.

While the package should theoretically run on any platform where Node.js can
run, it has only been tested and developed (so far) on Windows. 

It would also be an advantage to have the VirtualDJ software installed unless
you just want to work directly with the VDJ database XML files. They have a free
version that can be obtained on their web site. Tip: You are also able to create
database files from scratch using only this package.

If you want to create/modify vdjsamples with _new media content_, then [ffmpeg/ffprobe](https://ffmpeg.org/) is also needed. See note below under vdjsample example.

Install
-------

Run the following command in CLI to install this package into your project:

    npm i silverspex/vdj-data

Development
-----------

This step is only needed if you'd like to run the demos, fix bugs (PRs) or browse
around (you can alternatively download the demos manually). It requires a [git command](https://git-scm.com/downloads)
installed on your system. CD into a root folder where you want to clone, and run:

    git clone https://github.com/silverspex/vdj-data.git

Then cd into `vdj-data/`.

WANTED
------

If you have problems with your VDJ database or sample files I would be interested
in taking a look at them to see if I can build scripts to fix them automatically.

Please notify me in [issues](https://github.com/silverspex/vdj-data/issues) and I'll give you
an email to use to send me the data (or post a Dropbox/[Firefox send](https://send.firefox.com/) link if you don't mind). The data will be destroyed after use.

Examples
--------

Getting started. After npm has finished installed this package, you can
`require()` the package in your .js file to use the vdj-data API:

```javascript
// Import and use in your projects
const vdj = require('vdj-data');

// The VDJ Data API can now be used ..
````

If you only cloned the repo you would want to import the `index.js` file instead.
Just make sure the relative or absolute path resolves to the index.js file:

```javascript
// Import from the demo folder would look like this
const vdj = require('../index');
````

Also see these examples
-----------------------

- [Using the Database object](examples/EXAMPLES-DATABASE.md)
- [Using the Song object](examples/EXAMPLES-SONGS.md)
- [Using the Playlist object](examples/EXAMPLES-PLAYLISTS.md)
- [Using the VDJSample object](examples/EXAMPLES-VDJSAMPLE.md)
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

The package comes (eventually) with full API documentation which you find in the
`docs/` folder.

Issues
------

NOTE: The development is currently in ALPHA. The API may change without prior
notice. Many features are not yet implemented. However, most of what you would
need to read, write and maintain database information is ready for use.

Known issues:

- Currently system calls (detection of folder paths etc.) only works with Windows.

Feel free to use the issue tracker to [report issues](https://github.com/silverspex/vdj-data/issues), feature requests.

License
-------

**There is currently no license available.** However, you may download and evaluate the
package and use it in your personal non-commercial projects. Future licenses may be made
available for personal as well as commercial use.

Disclaimer: this project is unofficial and not affiliated with Atomix.

(c) Silverspex 2019-2020
