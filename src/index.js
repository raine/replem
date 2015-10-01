const joinPath = require('path').join;
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
const { __, chain, commute, concat, createMapEntry, curry, curryN, evolve, find, head, ifElse, invoker, isEmpty, join, last, map, merge, mergeAll, nth, pipe, pluck, project, propEq, replace, split, T, tail, take, toUpper, unary } = require('ramda');
const help = require('./help');
const npm = require('./npm');

const join2 = curryN(2, joinPath);
const unlines = join('\n');
const unwords = join(' ');
const die = (err) => {
  console.error(err.message || err);
  process.exit(1);
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

const contextForPkg = curry((_require, obj) => {
  const module = _require(obj.name);
  return merge(
    obj.extend ? module : {},
    { [obj.alias]: module }
  );
});

const makeReplContext = (_require, pkgData) =>
  mergeAll( map(contextForPkg(_require), pkgData) );

//    glob :: String -> Future Error [String]
const glob = (path) => Future((rej, res) =>
  _glob(path, (e, files) => e ? rej(e) : res(files)));

//    readFile :: String -> String -> Future Error String
const readFile = curry((encoding, filename) =>
  Future((rej, res) =>
    fs.readFile(filename, encoding, (e, data) =>
      e ? rej(e) : res(data))));

//    traverse :: Applicative f => (a -> f b) -> t a -> f (t b)
const traverse = (fn) => pipe(map(fn), commute(Future.of));

//    readDeps :: String -> [Object]
const readDeps = pipe(
  (p) => joinPath(p, '*', 'package.json'),
  glob,
  chain(traverse(readFile('utf8'))),
  map(map(unary(JSON.parse)))
);

//    startsWith :: String -> String -> Boolean
const startsWith = invoker(1, 'startsWith');

//    mergePkgData :: String -> [Object] -> [Object]
const mergePkgData = (modulesPath, pkgObjs) =>
  readDeps(modulesPath)
    .map(project(['_from', '_resolved', 'name', 'version']))
    // _from in package.json is "ramda@*" when install string is "ramda"
    .map(map(evolve({ _from: replace(/@\*$/, '') })))
    .map(data =>
      map(arg =>
        merge(arg, find(propEq('_from', arg.raw), data))
      , pkgObjs));

const defaultAliasToName = (pkg) =>
  merge({ alias: pkgNameAsVar(pkg.name) }, pkg);

const parseArgv = (argv) =>
  minimist(argv.slice(2), {
    alias: { h: 'help' }
  });

const main = (process) => {
  const replemPath = join2(process.env.HOME, '.replem');
  const replemModules = join2(replemPath, 'node_modules');
  const replemRequire = pipe(join2, require)(replemModules);
  const argv = parseArgv(process.argv);
  const pkgObjs = map(parseArg, argv._);
  const rawPkgNames = pluck('raw', pkgObjs);

  if (argv.help || isEmpty(rawPkgNames)) die(help);
  const interval = spinner();

  npm.load(replemPath)
    .chain(() => npm.install(rawPkgNames))
    .chain(() => {
      clearInterval(interval);
      return mergePkgData(replemModules, pkgObjs);
    })
    .map(map(defaultAliasToName))
    .fork(die, (pkgData) => {
      console.log(unlines([
        'Installed into REPL context:',
        formatInstalledList(pkgData)
      ]));

      const repl = argv.repl ? replemRequire(argv.repl) : require('repl');
      const r = repl.start({ prompt: '> ' });
      extend(r.context, makeReplContext(replemRequire, pkgData));
      replHistory(r, join2(replemPath, 'history'));
    });
};

main(process);
