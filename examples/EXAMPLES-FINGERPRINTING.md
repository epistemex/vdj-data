Audio Fingerprint (AcoustID)
============================

Getting AcoustID fingerprints (Windows/Mac (latter untested)):

```javascript
const vdj = require('vdj-data');

// The resulting fingerprint can be used with AcoustID etc.
const json = vdj.audio.getAudioFingerprint(pathToAudioFile);
console.log(json.fingerprint);    // AQADtEkyccoWCYmiF1P-DNeHY43xJvlxKsOTK0...
console.log(json.duration);       // duration in seconds

// or raw integer values for your own database or lookups:
const jsonRaw = vdj.audio.getAudioFingerprint(pathToAudioFile, true);  // request raw data
console.log(jsonRaw.fingerprint); // [723947855, 1764135188, ... ]
console.log(jsonRaw.duration);    // duration in seconds
```

Compare fingerprints:

```javascript
// get audio fingerprints using the raw option
const fp1 = vdj.audio.getAudioFingerprint('path/to/audio1.flac', true);
const fp2 = vdj.audio.getAudioFingerprint('path/to/audio1.mp3', true);

// use the simple matcher (doesn't consider offsets)
const score = vdj.audio.compareFingerprints(fp1, fp2);
console.log('Score:', score);
console.log(score > 0.9 ? 'Likely a match.' : 'Unlikely a match.');

// use matcher supporting larger offsets (max offset)
const score2 = vdj.audio.compareFingerprintsOffset(fp1, fp2, 200);
//...
```
You can use this in combination with for example a database to fingerprint all
your tracks, then run comparison between all to see the matching score between
them and use that to determine if you should move/delete the one of less quality
and so forth.

