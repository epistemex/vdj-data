vdj-data
========

Scripting engine for VirtualDJ to handle **databases**, **playlists**, **cue files** as
well as **backup and restore**, **path validation**, **cleaning**, **calculate audio fingerprint** that can be used to find duplicates based on content, [vdj sample files], [vdj folder files], [vdj filter files] and more.

You can also use it to easily **import/export** to/from from VDJ into other software,
databases. It has a built-in **file tag extractor** exposing extra data that
can be converted automatically.

Use it to build **complex workflow and pipelines** (e.g. automatic file format conversion,
file/folder organizing, mass custom tagging, metadata extraction and syncing,
interaction with external services and so forth).

This package is a building block component that can be used to make software
that handles VirtualDJ information, or simply to write quick scripts for
specific tasks that is not possible or easy to do within VirtualDJ itself.

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

Install
-------

Run the following command in CLI to install this package into your project:

    npm i silverspex/vdj-data

Development
-----------

This step is only needed if you'd like to run the demos, fix bugs (PRs) or browse
around. You can alternatively download the demos manually. It requires a [git command](https://git-scm.com/downloads)
installed on your system. CD into a root folder where you want to clone, and run:

    git clone https://github.com/silverspex/vdj-data.git

Then cd into `vdj-data/`.

Real world usage
----------------

If you are new to Node.js development, here are a few tips to get you started. You
will have to use the CLI (the command line) during development.

- Make sure Node.js has been installed correctly.
- Create a folder on your disk where you want to write and store your scripts.
- CD into that folder via command line and run `npm init -y`. This will create a `package.json` file in that folder.
- Now install `vdj-data` from the command line: `npm i silverspex/vdj-data` which is
added to the mentioned package.json above.
- You are now ready to go. Go to [npmjs.com](https://www.npmjs.com/) to see other cool 
packages you can optionally add to your project.

Create your main JavaScript file:

- Use a text editor, or run `touch index.js`, or your favorite IDE (VSCode, WebStorm etc.) to
create the main `index.js` file (or name it whatever you want).
- To import, write this line in your script: `const vdj = require('vdj-data');`
- You are now ready to use vdj-data; see examples below to get you started.
- To try, from command line run: `node .` (The dot indicates `index.js`, but you can use a
file name if your main JS file is called something else).

To turn this into a global command which can be run using the name you choose, look
at the [NPM documentation](https://docs.npmjs.com/packages-and-modules/).

If you don't like the command line, and since Node.js can be used as a web server,
you can easily create a web based user interface, or use something like electron.js
to build installable front-ends (make sure to read the license note below).

Or just make simple singleton scripts if that's all you need that you can run from
occasion to occasion. 

Examples
--------

Examples showing some of the functions the package offers. 

Always included in your projects:

```javascript
// Import and use in your projects
const vdj = require('vdj-data');

// VDJ Data API can now be used ..
````

If you only cloned the repo you would want to import the `index.js` file instead.
Just make sure the relative or absolute path resolves to the index.js file:

```javascript
// Import from the demo folder would look like this
const vdj = require('../index');

// VDJ Data API can now be used ..
````

Various ways to load and handle databases:

```javascript
// Get main VirtualDJ database.xml
const mainDatabasePath = vdj.getFilePath(vdj.FILE.DATABASE);

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
// convert to XML - REMEMBER TO BACKUP YOUR DATA FIRST (see below)
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

**Audio Fingerprint (AcoustID)**

Getting AcoustID fingerprints (Windows/Mac (latter untested)):

```javascript
const vdj = require('vdj-data');

// The resulting fingerprint can be used with AcoustID etc.
const json = vdj.utils.getAudioFingerprint(pathToAudioFile);
console.log(json.fingerprint);    // AQADtEkyccoWCYmiF1P-DNeHY43xJvlxKsOTK0...
console.log(json.duration);       // duration in seconds

// or raw integer values for your own database or lookups:
const jsonRaw = vdj.utils.getAudioFingerprint(pathToAudioFile, true);  // request raw data
console.log(jsonRaw.fingerprint); // [723947855, 1764135188, ... ]
console.log(jsonRaw.duration);    // duration in seconds
```

Compare fingerprints:

```javascript
// get audio fingerprints using the raw option
const fp1 = vdj.utils.getAudioFingerprint('path/to/audio1.flac', true);
const fp2 = vdj.utils.getAudioFingerprint('path/to/audio1.mp3', true);

// use the simple matcher (doesn't consider offsets)
const score = vdj.utils.compareFingerprints(fp1, fp2);
console.log('Score:', score);
console.log(score > 0.9 ? 'Likely a match.' : 'Unlikely a match.');

// use matcher supporting offset
const score2 = vdj.utils.compareFingerprintsOffset(fp1, fp2, 15);
//...
```
You can use this in combination with for example a database to fingerprint all
your tracks, then run comparison between all to see the matching score between
them and use that to determine if you should move/delete the one of less quality
and so forth.

**Backup**:

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

**Restore**:

Using restore will restore anything found in a zip backup file, whether it was
created by VirtualDJ or via `backup()`. 

```javascript
// Caution: Will overwrite anything in its path...
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
notice. Many features are not yet implemented. However, most of what you would
need to read, write and maintain database information is ready for use.

Known issues:

- Currently system calls (detection of folder paths etc.) only works with Windows.

Feel free to use the issue tracker to report issues, feature requests.

License
-------
There is currently no license available. You may download and evaluate the package
and use it in your personal non-commercial projects. Future licenses will be made
available for personal as well as commercial use.

Disclaimer: this project is unofficial and not affiliated with Atomix.

(c) Silverspex 2019-2020
