const { query, pool } = require("../config/db");

async function migrate() {
  console.log("Migrating: Adding performance indexes...");

  // Geo-spatial indexes for hazard proximity queries
  await query(
    `CREATE INDEX IF NOT EXISTS idx_hazard_lat_lon ON hazard (lat, lon);`,
  );
  console.log("  ✓ idx_hazard_lat_lon");

  // Geo-spatial indexes for shelter proximity queries
  await query(
    `CREATE INDEX IF NOT EXISTS idx_shelter_lat_lon ON shelter (lat, lon);`,
  );
  console.log("  ✓ idx_shelter_lat_lon");

  // User location lookups (for push notification proximity checks)
  await query(
    `CREATE INDEX IF NOT EXISTS idx_user_last_lat_lon ON user_account (last_lat, last_lon);`,
  );
  console.log("  ✓ idx_user_last_lat_lon");

  // Recent hazards (used in alert generation and push notifications)
  await query(
    `CREATE INDEX IF NOT EXISTS idx_hazard_occurred_at ON hazard (occurred_at DESC);`,
  );
  console.log("  ✓ idx_hazard_occurred_at");

  // Partial index for users with push tokens (most notification queries filter on this)
  await query(
    `CREATE INDEX IF NOT EXISTS idx_user_push_token ON user_account (push_token) WHERE push_token IS NOT NULL;`,
  );
  console.log("  ✓ idx_user_push_token");

  // Partial index for family membership lookups
  await query(
    `CREATE INDEX IF NOT EXISTS idx_user_family_id ON user_account (family_id) WHERE family_id IS NOT NULL;`,
  );
  console.log("  ✓ idx_user_family_id");

  console.log("Migration complete: All indexes created.");
}

if (require.main === module) {
  migrate()
    .then(() => {
      pool.end(); // keep your original "close pool" behavior
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      pool.end();
      process.exit(1);
    });
}

module.exports = { migrate };
