const { query } = require('../config/db');

async function migrate() {
    console.log('Migrating: Creating user_roles_v3 table...');

    await query(`
        CREATE TABLE IF NOT EXISTS user_roles_v3 (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL UNIQUE REFERENCES user_account(id) ON DELETE CASCADE,
            role TEXT NOT NULL DEFAULT 'member',
            created_at TIMESTAMPTZ DEFAULT now()
        );
    `);

    await query(`
        CREATE INDEX IF NOT EXISTS idx_user_roles_v3_user_id ON user_roles_v3(user_id);
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
