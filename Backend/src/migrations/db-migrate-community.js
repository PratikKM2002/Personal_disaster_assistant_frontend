const { query } = require('../config/db');

async function migrate() {
    console.log('Migrating community tables...');

    try {
        // 1. Add public_tag to user_account
        console.log('Adding public_tag to user_account...');
        await query(`
            ALTER TABLE user_account 
            ADD COLUMN IF NOT EXISTS public_tag TEXT UNIQUE DEFAULT NULL;
        `);

        // 2. Create user_neighbor table
        console.log('Creating user_neighbor table...');
        await query(`
            CREATE TABLE IF NOT EXISTS user_neighbor (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
                neighbor_id BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(user_id, neighbor_id),
                CHECK (user_id != neighbor_id)
            );
        `);

        // 3. Create community_resource table
        console.log('Creating community_resource table...');
        await query(`
            CREATE TABLE IF NOT EXISTS community_resource (
                id BIGSERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL REFERENCES user_account(id) ON DELETE CASCADE,
                type TEXT NOT NULL CHECK (type IN ('offering', 'requesting')),
                title TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'active' CHECK (status IN ('active', 'claimed', 'completed')),
                lat DOUBLE PRECISION NOT NULL,
                lon DOUBLE PRECISION NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        // 4. Index for geospatial queries on resources
        // (Optional but good for performance if we had PostGIS, but here just standard index maybe?)
        // For now, simple index on lat/lon might not help much without PostGIS, 
        // but we'll likely filter by lat/lon ranges in SQL.

        console.log('Migration details complete.');

    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    migrate().then(() => process.exit(0));
}

module.exports = { migrate };
