module.exports = `
Usage: replem [options] [<pkg>[:<alias>]]...

      --repl     require a custom repl
  -v, --verbose  enable verbose output
  -h, --help     displays help

Examples:

  replem ramda:R            # Install and provide ramda as variable R
  replem ramda!             # Extends REPL context with all functions of ramda
  replem ecto/node-timeago  # Installs a module from GitHub
  replem lodash@3.0.0       # Installs a module at specific version

Version: ${require('../package.json').version}

README: https://github.com/raine/replem`
  .replace(/^\n/, '');
