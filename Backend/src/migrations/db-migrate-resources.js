const { query } = require("../config/db");

async function migrate() {
  console.log("Migrating shelter table to support types...");

  // 1) Add 'type' column if it doesn't exist
  await query(`
    ALTER TABLE shelter 
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'shelter';
  `);

  // 2) Add index on type for faster filtering
  await query(`
    CREATE INDEX IF NOT EXISTS idx_shelter_type ON shelter(type);
  `);

  console.log(
    "Migration successful: Added type column + index to shelter table.",
  );
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}

module.exports = { migrate };
