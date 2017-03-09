#!/usr/bin/env bash
set -ex

rm -rf ~/.replem/node_modules
./bin/replem --no-repl ramda:R sanctuary!
./bin/replem --no-repl ramda@0.17
./bin/replem --no-repl ramda/ramda
