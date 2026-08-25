#!/bin/sh
set -eu

node migrate.js
exec node server.js
