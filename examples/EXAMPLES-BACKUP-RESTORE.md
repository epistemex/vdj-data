Backup
======

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

Restore
=======

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
