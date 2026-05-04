const { query } = require('../config/db');

async function migrate() {
    console.log('Migrating: Making password_hash nullable for OAuth users...');

    // Drop the NOT NULL constraint on password_hash (if it exists)
    // This allows Google-only users to have NULL password_hash
    await query(`
        ALTER TABLE user_account 
        ALTER COLUMN password_hash DROP NOT NULL;
    `);

    console.log('Migration complete: password_hash is now nullable');
}

if (require.main === module) {
    migrate().then(() => process.exit(0)).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { migrate };
