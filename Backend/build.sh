#!/usr/bin/env bash
set -e

echo "=== Installing dependencies ==="
npm install

echo "=== Running database migrations ==="
node src/scripts/db-init.js
node src/migrations/db-migrate-hazards.js
node src/migrations/db-migrate-profile.js
node src/migrations/db-migrate-alerts.js
node src/migrations/db-migrate-family.js
node src/migrations/db-migrate-shelters.js
node src/migrations/db-migrate-community.js
node src/migrations/db-migrate-push-token.js
node src/migrations/db-migrate-indexes.js
node src/migrations/db-migrate-resources.js
node src/migrations/db-migrate-safety.js
node src/migrations/db-migrate-chat-history.js
node src/migrations/fix-hazard-constraint.js

echo "=== Build complete ==="
