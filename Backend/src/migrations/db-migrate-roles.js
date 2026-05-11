const { query } = require('../config/db');

async function migrate() {
    console.log('Migrating: Creating user_roles_v3 table...');

    // Create user_roles_v3 table for family admin/member roles
    await query(`
        CREATE TABLE IF NOT EXISTS user_roles_v3 (
            user_id BIGINT PRIMARY KEY REFERENCES user_account(id) ON DELETE CASCADE,
            role TEXT NOT NULL DEFAULT 'member'
        );
    `);

    console.log('Migration complete: user_roles_v3 table created');
}

if (require.main === module) {
    migrate().then(() => process.exit(0)).catch((e) => {
        console.error(e);
        process.exit(1);
    });
}

module.exports = { migrate };
