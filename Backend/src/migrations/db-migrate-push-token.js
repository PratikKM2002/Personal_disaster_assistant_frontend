const { query } = require("../config/db");

async function migrate() {
  console.log("Migrating: Adding push_token to user_account...");

  await query(`
    ALTER TABLE user_account
    ADD COLUMN IF NOT EXISTS push_token TEXT;
  `);

  console.log("Migration successful: push_token added.");
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
