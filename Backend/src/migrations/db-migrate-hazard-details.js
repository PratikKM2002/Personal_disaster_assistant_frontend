const { query } = require('../config/db');

async function migrate() {
  console.log('Migrating: Creating hazard detail tables + shelter categories...');

  // ---- 1. Wildfire detail table ----
  await query(`
    CREATE TABLE IF NOT EXISTS wildfire_event (
      id BIGSERIAL PRIMARY KEY,
      hazard_id BIGINT NOT NULL REFERENCES hazard(id) ON DELETE CASCADE,
      acres NUMERIC,
      percent_contained NUMERIC,
      county TEXT,
      state TEXT
    );
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS wildfire_event_hazard_idx ON wildfire_event(hazard_id);`);
  console.log('  ✓ wildfire_event');

  // ---- 2. Flood detail table ----
  await query(`
    CREATE TABLE IF NOT EXISTS flood_event (
      id BIGSERIAL PRIMARY KEY,
      hazard_id BIGINT NOT NULL REFERENCES hazard(id) ON DELETE CASCADE,
      river_discharge NUMERIC,
      discharge_median NUMERIC,
      discharge_ratio NUMERIC,
      risk_level TEXT
    );
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS flood_event_hazard_idx ON flood_event(hazard_id);`);
  console.log('  ✓ flood_event');

  // ---- 3. Tsunami detail table ----
  await query(`
    CREATE TABLE IF NOT EXISTS tsunami_event (
      id BIGSERIAL PRIMARY KEY,
      hazard_id BIGINT NOT NULL REFERENCES hazard(id) ON DELETE CASCADE,
      warning_level TEXT,
      summary TEXT,
      source_url TEXT
    );
  `);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS tsunami_event_hazard_idx ON tsunami_event(hazard_id);`);
  console.log('  ✓ tsunami_event');

  // ---- 4. Add category column to shelter table ----
  await query(`
    ALTER TABLE shelter
    ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'emergency_shelter';
  `);
  await query(`CREATE INDEX IF NOT EXISTS idx_shelter_category ON shelter(category);`);

  // Backfill category from existing type values
  await query(`
    UPDATE shelter SET category = CASE
      WHEN type = 'hospital' OR type = 'clinic' THEN 'medical'
      WHEN type = 'fire_station' THEN 'fire_service'
      WHEN type = 'supply' THEN 'supply'
      ELSE 'emergency_shelter'
    END
    WHERE category = 'emergency_shelter' OR category IS NULL;
  `);
  console.log('  ✓ shelter.category column + backfill');

  // ---- 5. Drop restrictive hazard type CHECK constraint ----
  await query(`ALTER TABLE hazard DROP CONSTRAINT IF EXISTS hazard_type_check;`);
  console.log('  ✓ Dropped hazard_type_check constraint (allows future types)');

  console.log('Migration complete: Hazard detail tables + shelter categories created.');
}

if (require.main === module) {
  migrate().then(() => process.exit(0)).catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = { migrate };
