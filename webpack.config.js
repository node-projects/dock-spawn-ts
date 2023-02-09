const path = require('path');

module.exports = {
  entry: './lib/js/Exports.js',
  output: {
    path: path.resolve(__dirname, 'lib/es5'),
    filename: 'dock-spawn-ts.js',
    library: {
      name: 'DockSpawnTS',
      type: 'var',
    },
    hashFunction: "xxhash64"
  }
};