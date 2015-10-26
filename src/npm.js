const { Future } = require('ramda-fantasy');
const npm = require('npm'); 
const noop = () => {};
const log = console.log;
const { merge } = require('ramda')

exports.load = (prefix, _opts) => {
  const opts = merge({
    prefix,
    spin: false,
    loglevel: 'silent'
  }, _opts);

  return Future((rej, res) =>
    npm.load(opts, (err, data) =>
      err ? rej(err) : res(data)
    ));
};

exports.install = (packages) =>
  Future((rej, res) => {
    console.log = noop;
    npm.commands.install(packages, (err, out) => {
      console.log = log;
      err ? rej(err) : res(out);
    });
  });
