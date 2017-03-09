module.exports = `
Usage: replem [options] [<pkg>[:<alias>]]...

      --repl     require a custom repl
  -v, --verbose  enable verbose output
  -h, --help     displays help

Examples:

  replem ramda:R lodash@3.0.0
  replem ecto/node-timeago

Version: ${require('../package.json').version}

README: https://github.com/raine/replem`
  .replace(/^\n/, '');
