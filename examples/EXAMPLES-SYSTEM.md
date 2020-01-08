System Functions
================

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
