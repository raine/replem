# repl'em

Instantly try npm modules in REPL environment.

<img src="https://raw.githubusercontent.com/raine/replem/media/term.png" width="346" height="207">

## install

```sh
$ npm install -g replem
```

## usage

```
replem [<pkg>[@<version>[:<alias>]]]...
```

Launches a REPL session with specified packages installed and available in
the context.

By postfixing module's name with `:<alias>` you can set an alias for a
module.

A specific version can be installed by providing the version with syntax
`@<version>` after module name.

## notes

- Run with node v4.x for properly working tab autocompletion.
- Multiple versions of the same module cannot be used concurrently.
