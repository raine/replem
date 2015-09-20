const npm  = require('npm');
const path = require('path');
const { map, pipe, join, concat, head, ifElse, isEmpty, nth, chain, replace, createMapEntry, pluck, mergeAll, curryN, toUpper, tail, T, __, merge } = require('ramda');
const extend = require('xtend/mutable');
const { green, cyan } = require('chalk');
const camelCase = require('camelcase');
const spinner = require('char-spinner');
const replHistory = require('repl.history');
const npa = require('npm-package-arg');
const S = require('sanctuary');
const minimist = require('minimist');

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

const help = dedent(`
  Usage: replem [options] [<pkg>[@<version>[:<alias>]]]...

        --repl  require a custom repl
    -h, --help  displays help

  Examples:

    replem ramda:R lodash@3.0.0
    replem --repl coffee-script/repl lodash

  Version: ${require('../package.json').version}
`);

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
const formatInstalledList =
  pipe(map(pipe(
         ({alias, name}) =>
           unwords([
             cyan(`${name}@${readPkgVersion(name)}`),
             'as',
             green(alias)
           ]),
         concat(' - '))),
       join('\n'));

const capitalize = (str) => concat(toUpper(head(str)), tail(str));
const pascalCase = pipe(camelCase, capitalize);
const isUpper = (c) => toUpper(c) === c;
const isCapitalized = pipe(head, isUpper);
const pkgNameAsVar = ifElse(isCapitalized, pascalCase, camelCase);

const ALIAS  = /:([^!]+)/;
const EXTEND = /!$/;
const parseAlias = pipe(
  S.match(ALIAS), chain(nth(1)));
const parseExtend = pipe(
  S.match(EXTEND), map(T));
const rm = replace(__, '');
const orEmpty = S.fromMaybe({});
const parseArg = (arg) => {
  const { raw, name } = npa(rm(EXTEND, rm(ALIAS, arg)));
  return mergeAll([
    { alias: pkgNameAsVar(name) }, // default
    orEmpty(map(createMapEntry('alias'),  parseAlias(arg))),
    orEmpty(map(createMapEntry('extend'), parseExtend(arg))),
    { raw, name }
  ]);
};

const contextForPkg = (obj) => {
  const module = _require(obj.name);
  return merge(
    obj.extend ? module : {},
    { [obj.alias]: module });
};
const makeReplContext = pipe(map(contextForPkg), mergeAll);

const main = (process) => {
  const argv = minimist(process.argv.slice(2), {
    alias: { h: 'help' }
  });

  const parsedArgs = map(parseArg, argv._);
  const packages = pluck('raw', parsedArgs);
  if (argv.help || isEmpty(packages)) die(help);

  const interval = spinner();
  installMultiple(packages, () => {
    clearInterval(interval);
    console.log(`Installed into REPL context:\n${formatInstalledList(parsedArgs)}`);
    const repl = argv.repl ? _require(argv.repl) : require('repl');
    const r = repl.start({ prompt: '> ' });
    replHistory(r, join2(prefix, 'history'));
    extend(r.context, makeReplContext(parsedArgs));
  });
};

main(process);
