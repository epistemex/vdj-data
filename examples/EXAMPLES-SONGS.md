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

Using the advanced filename cleaner
-----------------------------------

vdj-data comes with a very advanced filename cleaner. It's not perfect as there
are many edge cases, but it can in many, if not most, situations improve the
quality of the filename and thus meta information for the VDJ database.

Simple call the `cleanName() `method on the Song object.

A few examples:

```javascript
// analyse, clean, structure parts into an object
const parts = song.cleanName();
/* example using file "Rudimental - Lay It All on Me (feat. Ed Sheeran) (Robin Schulz Extended Remix)"

{
  cleaned: 'Rudimental ft. Ed Sheeran - Lay It All On Me (Robin Schulz Extended Remix)',
  original: 'Rudimental - Lay It All on Me (feat. Ed Sheeran) (Robin Schulz Extended Remix).mp3',
  artists: [ 'Rudimental' ],
  title: 'Lay It All On Me',
  remix: 'Robin Schulz Extended Remix',
  year: null,
  featuring: 'Ed Sheeran',
  presents: null
}
*/
```

Force capitalization:

```javascript
const parts = song.cleanName({capitalize: true});
/* "Aryue - DON'T TALK" =>
{
  cleaned: "Aryue - Don't Talk",
  original: "Aryue - DON'T TALK.mp3",
  artists: [ 'Aryue' ],
  title: "Don't Talk",
  remix: null,
  year: null,
  featuring: null,
  presents: null
}*/

```

Removes double featuring, extracts to separate property:

```javascript
const parts = song.cleanName();
/* "Bear Grillz feat. Bok Nero - Don’t Stop Get It (feat. Bok Nero)" =>
{
  cleaned: 'Bear Grillz ft. Bok Nero - Don’t Stop Get It',
  original: 'Bear Grillz feat. Bok Nero - Don’t Stop Get It (feat. Bok Nero).mp3',
  artists: [ 'Bear Grillz' ],
  title: 'Don’t Stop Get It',
  remix: null,
  year: null,
  featuring: 'Bok Nero',
  presents: null
}*/
```

You can now pick and choose what parts you want to use to update the instance, or
for renaming the file itself.