const { query } = require("../config/db");

async function migrate() {
  console.log("Fixing hazard table constraints...");

  // Drop existing check constraint if it exists
  await query(`
    ALTER TABLE hazard 
    DROP CONSTRAINT IF EXISTS hazard_type_check;
  `);

  // Add new constraint with all required types
  await query(`
    ALTER TABLE hazard 
    ADD CONSTRAINT hazard_type_check 
    CHECK (type IN ('earthquake', 'flood', 'wildfire', 'tsunami'));
  `);

  console.log("Migration successful: Updated hazard type constraint.");
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
