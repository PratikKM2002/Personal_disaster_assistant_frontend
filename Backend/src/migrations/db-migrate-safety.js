const { query } = require('../config/db');

async function migrate() {
    console.log('Migrating safety message column...');
    try {
        await query(`
            ALTER TABLE user_account 
            ADD COLUMN IF NOT EXISTS safety_message TEXT DEFAULT NULL;
        `);
        console.log('Added safety_message column successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    migrate().then(() => process.exit(0));
}

module.exports = { migrate };
