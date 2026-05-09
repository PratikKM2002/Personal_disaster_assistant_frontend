const { query } = require('../config/db');

async function migrate() {
  console.log('Migrating: Creating weather_cache table...');

  await query(`
    CREATE TABLE IF NOT EXISTS weather_cache (
      lat NUMERIC NOT NULL,
      lon NUMERIC NOT NULL,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      PRIMARY KEY (lat, lon)
    );
  `);

  console.log('  ✓ weather_cache table created');
  console.log('Migration complete: weather_cache ready.');
}

if (require.main === module) {
  require('../config/env');
  migrate().then(() => process.exit(0)).catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { migrate };
