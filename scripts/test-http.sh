#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

pushd "$DIR"/../

node --inspect=0.0.0.0:9229 ./index.js server \
  port=7778 \
  siteUrl='https://test.zeovr.io:8080' \
  homeUrl='http://127.0.0.1:8081' \
  vridUrl='https://test.zeovr.io:8080' \
  crdsUrl='http://test.zeovr.io:9999' \
  dataDirectory='data/servers/server_two/data' dataDirectorySrc='defaults/data' \
  cryptoDirectory='data/servers/server_two/crypto' cryptoDirectorySrc='crypto' \
  installDirectory='data/servers/server_two/installed' &

sleep infinity;

popd;
