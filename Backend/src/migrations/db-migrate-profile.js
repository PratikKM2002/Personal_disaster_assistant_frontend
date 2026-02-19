const { query } = require('../config/db');

async function migrate() {
    console.log('Migrating: Adding blood_type to user_account and creating emergency_contact table...');

    // Add blood_type column to user_account
    await query(`
        ALTER TABLE user_account 
        ADD COLUMN IF NOT EXISTS blood_type TEXT
    `);

    // Create emergency_contact table
    await query(`
        CREATE TABLE IF NOT EXISTS emergency_contact (
            id BIGSERIAL PRIMARY KEY,
            user_id BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            relationship TEXT,
            is_primary BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT now()
        )
    `);

    console.log('Migration complete: blood_type + emergency_contact');
}

migrate().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
