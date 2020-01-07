vdj-data
========

JavaScript based scripting engine for VirtualDJ data files.

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
    - (todo) Repair malformed samples
    - (todo) Create new samples from scratch
    - (todo) Export with modifications
- Folders
    - (todo) create and modify virtual folders
    - (todo) create and modify filter folders
- CUE files:
    - Load and parse cue files
    - Convert to SRT, playlists for cloud services etc.
- Import/Export:
    - (todo) Import Serato data from file tags
    - (todo) Export as Serato file tags
- System utilities (Windows only for now):
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

New to Node development?
------------------------

See [this small write-up](./new-to-node-dev.md) to get you started.

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
// NOTICE: these are STATIC methods on the Database object itself.
const merged = vdj.Database.merge(databases);

// Split them out using ignoreDrives (Windows) and available drives:
const split = vdj.Database.split(merged);

// NOTE: REMEMBER TO BACKUP YOUR DATA FIRST FOR THE FOLLOWING:

// Export a database back to disk as XML:
database.write(mainDatabasePath);

// write back the array of databases from loadAllDatabases() or split();
split.forEach(db => db.write(db.path));
```

Various ways using a database:

```javascript
// iterate over all Song objects
database.songs.forEach(song => { /* do something with a song here */ });

// search returning array of matching Song objects
const results = database.search("talla world", {artists: true, title: true});

// find a Song using a path:
const songFromPath = database.findSongByPath('full/path/to/my/song.wav');

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
const oldSong2 = database.removeAt(7);

// verify song paths - unavailable songs returned as an Array of Song objects:
const unavailables = database.verifyPaths();

// convert to XML (string)
const xml = database.toXML();

// convert to JSON (object)
const json = database.toJSON();
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

// using tags (all fields from the db is available; just showing a couple in the examples):
const artist = song.tags.artist;
const title = song.tags.title;
// ...

// using infos
const playCount = song.infos.playCount;
// ...

// using scan
const bpm = song.scan.bpm;
// ...

// using POIs
song.pois.forEach(poi => { /* do something with a POI */ });
// or directly (here assuming there is one):
const firstPoiPosition = song.pois[0].pos;

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

Create playlists from scratch:

```javascript
// Load and merge all available VDJ databases for this demo
const db = vdj.Database.merge(vdj.loadAllDatabases());

// Create an empty playlist
const pl = new vdj.Playlist();

// add some random tracks (any track type in this example)
for(let i = 0; i < 50; i++) {
  const t = (Math.random() * db.songs.length)|0;
  pl.add(db.songs[t]);
}

// save out list - voila!
pl.write('path/to/random-playlist.m3u');
```

TIP: to write to VDJ's playlist folder, obtain path this way:

```javascript
const path = require('path');
const plPath = vdj.getFolderPath(vdj.FOLDER.PLAYLISTS);

// Then merge and write:
pl.write(path.join(plPath, 'random-playlist.m3u'));
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

// use matcher supporting larger offsets (max offset)
const score2 = vdj.utils.compareFingerprintsOffset(fp1, fp2, 200);
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
