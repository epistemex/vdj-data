Playlists
=========

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
// Load and merge all available VDJ databases, and we only need the songs array:
const songs = vdj.Database.merge(vdj.loadAllDatabases()).songs;

// Create an empty playlist
const pl = new vdj.Playlist();

// add 100 random tracks (any track type in this example)
for(let i = 0; i < 100; i++) {
  const t = (Math.random() * songs.length)|0;
  pl.add(songs[t]);
}

// save out list - voila!
pl.write('path/to/random-playlist.m3u');
```

TIP: to write to VDJ's playlist folder, obtain path this way:

```javascript
const path = require('path');
const plPath = vdj.FOLDER.PLAYLISTS;

// Then merge and write:
pl.write(path.join(plPath, 'random-playlist.m3u'));
```

