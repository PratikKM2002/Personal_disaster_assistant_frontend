const { query } = require('../config/db');

async function migrate() {
    console.log('Migrating: Adding clerk_user_id column...');

    // Add clerk_user_id column for Clerk-based auth (replaces custom JWT)
    await query(`
        ALTER TABLE user_account 
        ADD COLUMN IF NOT EXISTS clerk_user_id TEXT DEFAULT NULL;
    `);

    // Create index for fast lookups by clerk_user_id
    await query(`
        CREATE INDEX IF NOT EXISTS idx_user_clerk_id 
        ON user_account(clerk_user_id) 
        WHERE clerk_user_id IS NOT NULL;
    `);

    console.log('Migration complete: clerk_user_id column added');
}

if (require.main === module) {
    migrate().then(() => process.exit(0)).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { migrate };
