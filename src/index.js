const npm = require('npm');
const path = require('path');
const extend = require('xtend/mutable');
const { green, cyan } = require('chalk');
const camelCase = require('camelcase');
const spinner = require('char-spinner');
const replHistory = require('repl.history');
const npa = require('npm-package-arg');
const S = require('sanctuary');
const minimist = require('minimist');
const _glob = require('glob');
const fs = require('fs');
const { Future } = require('ramda-fantasy');
const { map, pipe, concat, head, ifElse, isEmpty, nth, chain, replace, createMapEntry, pluck, mergeAll, curryN, toUpper, tail, T, __, merge, propEq, split, last, curry, commute, unary, project, invoker, find, evolve, join, take } = require('ramda');
const help = require('./help');

const join2 = curryN(2, path.join);
const prefix = join2(process.env.HOME, '.replem');
const prefixModules = join2(prefix, 'node_modules');
const _require = pipe( join2(prefixModules), require );
const unlines = join('\n');
const unwords = join(' ');
const noop = () => {};
const log = console.log;
const die = (err) => {
  console.error(err.message || err);
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

const getResolvedSha = pipe( split('#'), last, take(7) );
const formatVersion = (resolved, version) =>
  startsWith('git://', resolved)
    ? '#' + getResolvedSha(resolved)
    : '@' + version;

const formatInstalledList =
  pipe(map(pipe(
         ({alias, name, version, _resolved}) =>
           unwords([
             cyan(`${name}${formatVersion(_resolved, version)}`),
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
const cleanArg = pipe(...map(rm, [ EXTEND, ALIAS ]));
const orEmpty = S.fromMaybe({});

const parseArg = (arg) => {
  const cleaned = cleanArg(arg);
  const { raw } = npa(cleaned);
  return mergeAll([
    orEmpty(map(createMapEntry('alias'),  parseAlias(arg))),
    orEmpty(map(createMapEntry('extend'), parseExtend(arg))),
    { raw }
  ]);
};

const contextForPkg = (obj) => {
  const module = _require(obj.name);
  return merge(
    obj.extend ? module : {},
    { [obj.alias]: module });
};
const makeReplContext = pipe(map(contextForPkg), mergeAll);

//    glob :: String -> Future Error [String]
const glob = (path) => Future((rej, res) =>
  _glob(path, (e, files) => e ? rej(e) : res(files)));

//    readFile :: String -> String -> Future Error String
const readFile = curry((encoding, filename) =>
  Future((rej, res) =>
    fs.readFile(filename, encoding, (e, data) =>
      e ? rej(e) : res(data))));

//    traverse :: Applicative f => (a -> f b) -> t a -> f (t b)
const traverse = (fn) => pipe(map(fn), commute(Future.of))

//    readDeps :: String -> [Object]
const readDeps = pipe(
  (p) => path.join(p, 'node_modules', '*', 'package.json'),
  glob,
  chain(traverse(readFile('utf8'))),
  map(map(unary(JSON.parse)))
);

//    startsWith :: String -> String -> Boolean
const startsWith = invoker(1, 'startsWith');

//    mergePkgData :: String -> [Object] -> [Object]
const mergePkgData = (prefix, parsedArgs) =>
  readDeps(prefix)
    .map(project(['_from', '_resolved', 'name', 'version']))
    // _from in package.json is "ramda@*" when install string is "ramda"
    .map(map(evolve({ _from: replace(/@\*$/, '') })))
    .map(data =>
      map(arg =>
        merge(arg, find(propEq('_from', arg.raw), data))
      , parsedArgs));

const defaultAliasToName = (pkg) =>
  merge({ alias: pkgNameAsVar(pkg.name) }, pkg);

const main = (process) => {
  const argv = minimist(process.argv.slice(2), {
    alias: { h: 'help' }
  });

  const parsedArgs = map(parseArg, argv._);
  const raws = pluck('raw', parsedArgs);
  if (argv.help || isEmpty(raws)) die(help);

  const interval = spinner();
  installMultiple(raws, () => {
    clearInterval(interval);

    mergePkgData(prefix, parsedArgs)
      .map(map(defaultAliasToName))
      .fork(die, (pkgData) => {
        console.log(unlines([
          'Installed into REPL context:',
          formatInstalledList(pkgData)
        ]));
        const repl = argv.repl ? _require(argv.repl) : require('repl');
        const r = repl.start({ prompt: '> ' });
        replHistory(r, join2(prefix, 'history'));
        extend(r.context, makeReplContext(pkgData));
      });
  });
};

main(process);
