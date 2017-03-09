const { Future } = require('ramda-fantasy');
const npm = require('npm'); 
const noop = () => {};
const log = console.log;

exports.load = (opts) =>
  Future((rej, res) =>
    npm.load(opts, (err, data) =>
      err ? rej(err) : res(data)
    ));

exports.install = (packages) =>
  Future((rej, res) => {
    console.log = noop;
    npm.commands.install(packages, (err, out) => {
      console.log = log;
      err ? rej(err) : res(out);
    });
  });
