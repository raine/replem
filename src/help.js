module.exports = dedent(`
  Usage: replem [options] [<pkg>[@<version>[:<alias>]]]...

        --repl  require a custom repl
    -h, --help  displays help

  Examples:

    replem ramda:R lodash@3.0.0
    replem ecto/node-timeago

  Version: ${require('../package.json').version}

  README: https://github.com/raine/replem
`);
