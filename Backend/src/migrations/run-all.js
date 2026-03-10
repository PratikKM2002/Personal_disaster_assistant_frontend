require('../config/env'); // load .env

async function run() {
  // Order matters (FKs + constraints)
  const migrations = [
    './db-migrate-community',
    './db-migrate-family',
    './db-migrate-profile',

    './db-migrate-hazards',
    './fix-hazard-constraint',

    './db-migrate-shelters',
    './db-migrate-resources',
    './db-migrate-safety',

    './db-migrate-push-token',
    './db-migrate-chat-history',

    './db-migrate-indexes',
    './db-migrate-alerts',
  ];

  for (const m of migrations) {
    console.log(`\n==> Running ${m}`);
    await require(m).migrate();
  }

  console.log('\n✅ All migrations complete');
}

run()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('❌ Migration failed:', e);
    process.exit(1);
  });