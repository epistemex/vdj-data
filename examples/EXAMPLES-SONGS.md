Song object
===========

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
