#!/usr/bin/env bash
set -ex

rm -rf ~/.replem/node_modules
./bin/run --no-repl ramda:R sanctuary!
./bin/run --no-repl ramda@0.17
./bin/run --no-repl ramda/ramda
