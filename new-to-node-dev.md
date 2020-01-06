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
