const minimist = require('minimist');

module.exports = (argv) =>
  minimist(argv.slice(2), {
    alias: { h: 'help', v: 'verbose' },
    boolean: ['help', 'verbose']
  });
