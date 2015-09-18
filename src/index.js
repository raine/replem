const npm  = require('npm');
const path = require('path');
const repl = require('repl');
const argv = require('minimist')(process.argv.slice(2));
const { map, split, pipe, apply, fromPairs, reverse, values, mapObj, toPairs, join, concat, adjust, curry, head, ifElse } = require('ramda');
const extend = require('xtend/mutable');
const chalk = require('chalk');
const camelCase = require('camelcase');
const spinner = require('char-spinner');

const prefix = path.join(process.env.HOME, '.replem');
const noop   = () => {};
const log    = console.log;

process.env.NODE_PATH = prefix;
require('module').Module._initPaths();

const die = (err) => {
  console.error(err);
  process.exit(1);
};

const installMultiple = (packages, cb) => {
  npm.load({ prefix, spin: false }, (err) => {
    if (err) die(err);
    console.log = noop;
    npm.commands.install(packages, (err) => {
      if (err) die(err);
      console.log = log;
      cb();
    });
  });
};

const parseContextFromArgv = pipe(
  map(pipe(
    split(':'),
    reverse,
    apply((a, b) => [a, b || a]))),
  fromPairs
);

const formatInstalledStr = pipe(
  toPairs,
  map(pipe(
    ([alias, pkg]) =>
      chalk.green(alias) +
        chalk.cyan(alias !== pkg ? ` (${pkg})` : ''),
    concat(' - ')
  )),
  join('\n')
);

const mapKeys = curry((fn, obj) =>
  fromPairs(map(adjust(fn, 0), toPairs(obj))));

const capitalize = (str) => str[0].toUpperCase() + str.slice(1);
const pascalCase = pipe(camelCase, capitalize);
const isUpper = (c) => c.toUpperCase() === c;
const isCapitalized = pipe(head, isUpper);
const smartCase = ifElse(isCapitalized, pascalCase, camelCase);

const context = mapKeys(smartCase, parseContextFromArgv(argv._));
const packages = values(context);

const interval = spinner();
installMultiple(packages, () => {
  clearInterval(interval);
  console.log(`Installed into REPL context:\n${formatInstalledStr(context)}`);
  const r = repl.start({ prompt: '> ' });
  extend(r.context, mapObj(require, context));
});
