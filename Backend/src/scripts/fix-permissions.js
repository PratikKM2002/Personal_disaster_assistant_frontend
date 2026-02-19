const { pool, query } = require('../config/db');

async function fixPermissions() {
    try {
        console.log('--- Fixing Permissions ---');

        // We are connecting as 'postgres' (default because we didn't load .env)
        // We need to grant permissions to the user defined in .env ('pda_user')
        const targetUser = 'pda_user';

        console.log(`Granting permissions to: ${targetUser}`);

        // Grant on tables
        await query(`GRANT ALL PRIVILEGES ON TABLE user_neighbor TO "${targetUser}"`);
        await query(`GRANT ALL PRIVILEGES ON TABLE community_resource TO "${targetUser}"`);

        // Grant on sequences (for ID generation)
        await query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${targetUser}"`);

        console.log('Permissions granted successfully!');

    } catch (err) {
        console.error('Permission fix failed:', err.message);
    } finally {
        await pool.end();
    }
}

fixPermissions();
