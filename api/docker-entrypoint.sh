#!/bin/sh
# Container start: apply pending migrations, seed reference data (skips what exists), start the API.
set -e

node node_modules/typeorm/cli.js migration:run -d dist/database/data-source.js
node dist/database/seeds/run-seeds.js
exec node dist/main.js
