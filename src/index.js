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
const { __, add, chain, commute, complement, concat, cond, curry, curryN, evolve, filter, find, head, ifElse, intersection, isEmpty, join, last, map, merge, mergeAll, nth, objOf, partial, path, pipe, project, propEq, replace, split, T, tail, take, tap, toUpper, unary } = require('ramda');
const help = require('./help');
const npm = require('./npm');

//    overlaps :: [a] -> [a] -> Boolean
const overlaps = pipe(intersection, complement(isEmpty));
const join2 = curryN(2, joinPath);
const unlines = join('\n');
const unwords = join(' ');
const die = (err) => {
  console.error(err.message || err);
  process.exit(1);
};

if (overlaps(['-v', '--verbose'], process.argv))
  require('debug').enable('replem');

const debug = require('debug')('replem');

//    startsWith :: String -> String -> Boolean
const startsWith = curry((x, str) => str.indexOf(x) === 0);

const getResolvedSha = pipe( split('#'), last, take(7) );
const formatVersion = (resolved, version) =>
  pipe(S.toMaybe,
       filter(startsWith('git://')),
       map(getResolvedSha),
       S.maybe(`@${version}`, add('#'))
      )(resolved);

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
  return mergeAll([
    orEmpty(map(objOf('alias'),  parseAlias(arg))),
    orEmpty(map(objOf('extend'), parseExtend(arg))),
    { npa: npa(cleaned) }
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
  mergeAll(concat(map(contextForPkg(_require), pkgData), [
    { replem: { require: _require,
                modules: pkgData } }
  ]));

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

//    readDeps :: String -> Future Error [Object]
const readDeps = pipe(
  (p) => joinPath(p, '*', 'package.json'),
  glob,
  chain(traverse(readFile('utf8'))),
  map(map(unary(JSON.parse)))
);

const makePkgMatchPred = cond([
  [ propEq('type', 'range'),
    (npa) => (pkg) =>
      pkg._from === npa.raw ||
      pkg._from === `${npa.name}@${npa.spec}` ],
  [ T, (npa) => propEq('_from', npa.raw) ]
]);

//    mergePkgData :: String -> [Object] -> Future Error [Object]
const mergePkgData = (modulesPath, pkgObjs) =>
  readDeps(modulesPath)
    .map(project(['_from', '_resolved', 'name', 'version']))
    // _from in package.json is "ramda@*" when install string is "ramda"
    .map(map(evolve({ _from: replace(/@\*$/, '') })))
    .map(data =>
      map(arg =>
        merge(arg, find(makePkgMatchPred(arg.npa), data))
      , pkgObjs));

const defaultAliasToName = (pkg) =>
  merge({ alias: pkgNameAsVar(pkg.name) }, pkg);

const parseArgv = (argv) =>
  minimist(argv.slice(2), {
    alias: { h: 'help', v: 'verbose' },
    boolean: ['help', 'verbose']
  });

const main = (process) => {
  const replemPath = join2(process.env.HOME, '.replem');
  const replemModules = join2(replemPath, 'node_modules');
  const replemRequire = pipe(join2(replemModules), require);
  const argv = parseArgv(process.argv);
  const pkgObjs = map(parseArg, argv._);
  const rawPkgNames = map(path(['npa', 'raw']), pkgObjs);
  debug('parsed args', pkgObjs);

  if (argv.help || isEmpty(rawPkgNames)) die(help);
  const interval = spinner();

  npm.load(replemPath)
    .chain(() => npm.install(rawPkgNames))
    .chain(() => {
      clearInterval(interval);
      return mergePkgData(replemModules, pkgObjs);
    })
    .map(tap(partial(debug, ['pkg data'])))
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
      if (argv.repl === false) r.close();
    });
};

main(process);
