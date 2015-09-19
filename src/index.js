const npm  = require('npm');
const path = require('path');
const { map, pipe, join, concat, head, ifElse, isEmpty, nth, chain, replace, createMapEntry, pluck, mergeAll, curryN } = require('ramda');
const extend = require('xtend/mutable');
const { green, cyan } = require('chalk');
const camelCase = require('camelcase');
const spinner = require('char-spinner');
const replHistory = require('repl.history');
const npa = require('npm-package-arg');
const S = require('sanctuary');
const argv = require('minimist')(process.argv.slice(2), {
  alias: { h: 'help' }
});

const join2 = curryN(2, path.join);
const prefix = join2(process.env.HOME, '.replem');
const prefixModules = join2(prefix, 'node_modules');
const _require = pipe( join2(prefixModules), require );
const noop = () => {};
const log = console.log;

const die = (err) => {
  console.error(err);
  process.exit(1);
};

const installMultiple = (packages, cb) => {
  npm.load({ prefix, spin: false, loglevel: 'silent' }, (err) => {
    if (err) die(err);
    console.log = noop;
    npm.commands.install(packages, (err) => {
      console.log = log;
      if (err) die(err.message || err);
      cb();
    });
  });
};

const readPkgVersion = (name) =>
  _require(join2(name, 'package.json')).version;

const unwords = join(' ');
const formatInstalledList = pipe(
  map(pipe(
    ({alias, name}) =>
      unwords([
        cyan(`${name}@${readPkgVersion(name)}`),
        'as',
        green(alias)
      ]),
    concat(' - '))),
  join('\n')
);

const capitalize = (str) => str[0].toUpperCase() + str.slice(1);
const pascalCase = pipe(camelCase, capitalize);
const isUpper = (c) => c.toUpperCase() === c;
const isCapitalized = pipe(head, isUpper);
const smartCase = ifElse(isCapitalized, pascalCase, camelCase);

const ALIAS = /:(.+)$/;
const rmAlias = replace(ALIAS, '');
const parseAlias = pipe(
  S.match(ALIAS),
  chain(nth(1))
);

const orEmpty = S.fromMaybe({});
const parseArg = (arg) => {
  const { raw, name } = npa(rmAlias(arg));
  return mergeAll([
    { alias: smartCase(name) }, // default
    orEmpty(map(createMapEntry('alias'), parseAlias(arg))),
    { raw, name }
  ]);
};

const parsed = map(parseArg, argv._);
const packages = pluck('raw', parsed);
const contextForPkg = (obj) => {
  return { [obj.alias]: _require(obj.name) }; };
const makeContext = pipe(map(contextForPkg), mergeAll);

const help = dedent(`
  Usage: replem [options] [<pkg>[@<version>[:<alias>]]]...

        --repl  require a custom repl
    -h, --help  displays help

  Examples:

    replem ramda:R lodash@3.0.0
    replem --repl coffee-script/repl lodash

  Version: ${require('../package.json').version}
`);

if (argv.help || isEmpty(packages)) die(help);

const interval = spinner();
installMultiple(packages, () => {
  clearInterval(interval);
  console.log(`Installed into REPL context:\n${formatInstalledList(parsed)}`);
  const repl = argv.repl ? _require(argv.repl) : require('repl');
  const r = repl.start({ prompt: '> ' });
  replHistory(r, join2(prefix, 'history'));
  extend(r.context, makeContext(parsed));
});
