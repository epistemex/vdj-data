Database object
===============

Various ways to load and handle databases:

```javascript
// Load and parse the main database
const database = vdj.loadDatabase(vdj.FILE.DATABASE);
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

// Export the database back to disk as XML:
database.write(vdj.FILE.DATABASE);

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
