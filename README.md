vdj-data
========

[![Made for VirtualDJ](https://i.imgur.com/4jQVHVi.png)](https://virtualdj.com/)

Scripting engine for VirtualDJ to handle databases, playlists, cue files as
well as backup and restore, path validation, cleaning and more.

This package is a building block component that can be used to make software
that handles VirtualDJ information, or simply to write quick scripts for
specific tasks that is not possible or easy to do within VirtualDJ itself.

Prerequisites
-------------

You will need [Node.js](https://nodejs.org/en/) v12+ (it may work with older
versions, but this has not been tested) for this package.

It is assumed you already know how to use Node.js and NPM if you plan to
integrate this package with your software.

While the package should theoretically run on any platform where Node.js can
run, it has only been tested and developed (so far) on Windows. 

It would also be a big advantage to have the VirtualDJ software installed.
If you don't have already, you can use their free version [from here](https://virtualdj.com/download/index.html).

Install
-------

Run the following command in CLI to install this package into your project:

    npm i silverspex/vdj-data

Development
-----------

To run demos or to create PRs, clone this repo using git in the current directory:

    git clone https://github.com/silverspex/vdj-data.git

Or SSH if you prefer. Then cd into `vdj-data/`.

Examples
--------

Examples showing some of the functions the package offers. 

Always included in your projects:

```javascript
// Import and use in your projects
const vdj = require('vdj-data');

// VDJ Data API can now be used ..
````

Various ways to load and handle databases:

```javascript
// Get main VirtualDJ database.xml
const mainDatabasePath = vdj.getSubFile(vdj.FILE.DATABASE);

// Load and parse a single database
const database = vdj.loadDatabase(mainDatabasePath);
if (database) {
  // use here...
}

// Load all available databases from various drives (Windows only for now)
const databases = vdj.loadAllDatabases();

// Merge all databases into a single instance for simplified use:
const merged = vdj.Database.merge(databases);

// Split them out using ignoreDrives (Windows) and available drives:
const split = vdj.Database.split(merged);

// Export a database back to disk as XML:
database.export(mainDatabasePath);
````

Various ways using a database:

```javascript
// iterate over all Song objects
database.songs.forEach(song => { /* do something with a song here */ });

// search returning array of matching Song objects
const results = database.search("talla world", {artists: true, title: true});

// load a song initializing path and size
const song = database.loadSong('path/to/song.mp3');

// load a song and parse tags if any (uses Promise)
const songAndTags = await database.loadSongAndTags('path/to/song.flac');

// add to database
database.add(song);
database.add(songAndTags);

// remove a song
const oldSong = database.remove(song);

// remove a song using an index
const oldSong2 = database.remove(7);

// verify song paths - unavailable songs returned as an Array of Song objects:
const unavailables = database.verifyPaths();

// convert to XML - REMEMBER TO BACKUP YOUR DATA FIRST (see below)
const xml = database.toXML();
```

Various ways using Song objects:

```javascript
// Get first song in database assuming there is one
const song = database.songs[0];

// convert to strings
const txt = song.toString();     // -> artists - title (remix)
const tx7 = song.toString('%title - %artist [%remix] [%year]');

song.filenameToTag();

// top-level information
const path = song.filePath;
const size = song.fileSize;

// using tags:
const artist = song.tags.artist;
const title = song.tags.title;

// using infos
const playCount = song.infos.playCount;

// using scan
const bpm = song.scan.bpm;

// verify path
const success = song.verifyPath();

// update comment
song.comment = 'Edited via VDJ Data API!';
```

Using Playlists:

```javascript
// Load a Playlist
const pl = vdj.loadPlaylist('path/to/playlist.m3u');

// number of Song objects with valid paths
const plSongCount = pl.songs.length;

// array with path strings of missing files
const plMissing = pl.verifyPaths();

// compile to string that can be saved as new playlist
const newPlaylist = pl.compile();
```

Backup:

Using backup will backup databases from all available VirtualDJ drives, playlists,
folders, mappings, history, settings, samples etc. You can also define a custom
list as a 3. argument if you prefer.

The backup zip files may be both one created by VirtualDJ itself, or the one
created using this package's `backup()` method as shown below.

```javascript
// get list of all database paths except main as backup() includes that
const databasePaths = isWin 
  ? vdj.getDrivePaths(true, false).map(p => path.join(p, 'database.xml'))
  : undefined; // getDrivePaths() not currently supported on Mac

// backup() uses Promise
vdj
  .backup(`vdj-backup-${ Date.now() }.zip`, databasePaths)
  .then(success => { /* next step from here */ })
  .catch(error => { /* an error occurred */ })

// or use async/await
(async () => {
  try {
    const success = await vdj.backup(`vdj-backup-${ Date.now() }.zip`, databasePaths);
  }
  catch(err) { /* an error occurred */ }
})();
```

Restore:

Using restore will restore anything found in a zip backup file, whether it was
created by VirtualDJ or via `backup()`. 

```javascript
// Caution: Will overwrite anything in its way...
(async () => {
  const homeFolder = vdj.getVDJHome();
  const status = await vdj.restore('path/to/backup.zip', homeFolder);
  //...
})();
```

System functions:

```javascript
// check if VirtualDJ is running to block reading/writing database.xml files
(async () => {
  const running = await vdj.isRunning();
  if (!running) { /* do yar thang... */ }
})();

// list all drives with VirtualDJ databases and get basic drive info
const drives = vdj.getDrives();

// always a main home drive if VirtualDJ is installed
console.log(drives);
/* =>
[
  {
    root: 'D:\\',
    folder: 'D:\\docs\\VirtualDJ',
    size: 1000203087872,
    free: 569048289280,
    type: 'Local Fixed Disk',
    main: true
  },
  ...
*/

// globally available after importing 'vdj-data'
if (isWin) { /* Windows version */ }
if (isMac) { /* OSX version */ }

// or use global.isWin / global.isMac
```

Demos
-----

The folder demos/ contains some demo scripts. To run, open CLI, "cd" to root folder
and type:

    node demos\name-of-demo <args-if-any>

See content of each file for details.

Documentation
-------------

The package comes (eventually) with full API documentation which you find in the
docs/ folder.

Performance
-----------

Currently load and parse about 25,000 - 30,000 song entries in less than a second,
depending on system configuration and database details (this result with a slow
spinning disk, 23 mb database, i7).

The code base is not fully optimized so expect even better performance over time.

Issues
------

NOTE: The development is currently in ALPHA. The API may change without prior
notice. Many features are not yet implemented.

Known issues:

- Possible issue with double encoded entities (e.g. "&amp;amp;amp;").
- Documentation is currently incomplete.
- Needs refactoring
- Currently system calls (detection of folder paths etc.) only works with Windows.

Feel free to use the issue tracker to report issues, feature requests.

License
-------
There is currently no license available. You may download and evaluate the package
and use it in your personal non-commercial projects. Future licenses will be made
available for personal as well as commercial use.

(c) Silverspex 2019
