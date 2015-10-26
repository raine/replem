const { concat, curry, filter, join, last, map, pipe, split, take } = require('ramda');
const { green, cyan } = require('chalk');
const S = require('sanctuary');

//    startsWith :: String -> String -> Boolean
const startsWith = curry((x, str) => str.indexOf(x) === 0);

const unwords = join(' ');
const getResolvedSha = pipe( split('#'), last, take(7) );

const formatVersion = (resolved, version) =>
  pipe(S.toMaybe,
       filter(startsWith('git://')),
       map(getResolvedSha),
       S.maybe(`@${version}`, concat('#'))
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


module.exports = formatInstalledList;
