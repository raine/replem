# repl'em [![npm version](https://badge.fury.io/js/replem.svg)](https://www.npmjs.com/package/replem)

Instantly try npm modules in REPL environment.

<img src="https://raw.githubusercontent.com/raine/replem/media/term.png" width="346" height="207">

## features

- Install modules from npm or directly from GitHub at particular commit or branch.
- Use a custom REPL like `coffee-script/repl`.
- Retains history of past sessions.

## install

```sh
$ npm install -g replem
```

## usage

```
replem [options] [<pkg>[:<alias>]]...

        --repl     require a custom repl
    -v, --verbose  enable verbose output
    -h, --help     displays help
```

Launches a REPL session with specified packages installed and available in
the context.

## arguments

Uses [`npm install`](https://docs.npmjs.com/cli/install) internally, so
similar types of arguments are accepted.

For example:

- Install a specific version: `replem lodash@3.0.0`
- Install a module from GitHub: `replem githubname/reponame#commit`

By postfixing module's name with `:<alias>` you can set an alias for a
module. Module's exports will be available under this name.

```sh
$ replem ramda:R
Installed into REPL context:
 - ramda@0.17.1 as R
> R.inc(1) // 2
```

With a bang (`!`) after everything, all module's properties will be directly
available in context:

```sh
$ replem ramda!
Installed into REPL context:
 - ramda@0.17.1 as ramda
> reduce === ramda.reduce
true
```

## custom repl

To use a custom repl, install it to `~/.replem/node_modules` first:

```sh
$ npm install --prefix ~/.replem coffee-script
$ replem --repl coffee-script/repl lodash
> (n * 2 for n in [0..5])
Array [ 0, 2, 4, 6, 8, 10 ]
```

## requiring from inside installed modules

The REPL context is provided with the function `replem.require()` that can be
used to require from under `~/.replem/node_modules`.

## caveats

- Run with node v4.x for properly working tab autocompletion.
- Multiple versions of the same module cannot be used concurrently.
