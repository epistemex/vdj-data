VDJSample object
================

Load an existing sample:

```javascript
const sample = new Sample('path/to/sample.vdjsample');

// update thumb
sample.setThumb('path/tp/thumb.png');

// write back update sample
const dst = Path.join(vdj.FOLDER.SAMPLER, 'sample.vdjsample');
s.write(dst);
```
Tip: you may be able to repair mangled samples just by loading and saving them
back as the internals will recompile the entire sample.

Creating a new vdjsample to use with VDJ is easy:

```javascript
const sample = new Sample();
sample.setMedia('path/to/sample.flac'); // see note below
sample.setThumb('path/tp/thumb.png');   // optional

const dst = Path.join(vdj.FOLDER.SAMPLER, 'my-new-sample.vdjsample');
s.write(dst);
```

**Note** that setting media (`setMedia()`)will require **ffmpeg**/**ffprobe**
installed on your computer and available in the PATH (can run from anywhere).

They are free and can be installed and forgotten about. Download a version for
your platform from [ffmpeg.org](https://ffmpeg.org/).

These are used to convert and validate the media to make sure it is saved in a VDJ
compatible format. It also allows you to use almost any source type, codec.

