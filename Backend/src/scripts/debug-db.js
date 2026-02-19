const { pool, query } = require('../config/db');

async function debug() {
    try {
        console.log('--- Database Debug Info ---');

        // 1. Check current user
        const resUser = await query('SELECT current_user, session_user');
        const currentUser = resUser.rows[0].current_user;
        console.log('Connected as:', currentUser);
        console.log('Session user:', resUser.rows[0].session_user);

        // 2. Check table ownership
        const resOwner = await query(`
            SELECT tablename, tableowner 
            FROM pg_tables 
            WHERE tablename IN ('user_neighbor', 'community_resource', 'user_account')
        `);
        console.log('Table Ownership:');
        console.table(resOwner.rows);

        // 3. Check permissions (simple check via information_schema)
        const resPerms = await query(`
            SELECT grantee, privilege_type 
            FROM information_schema.role_table_grants 
            WHERE table_name = 'user_neighbor' AND grantee = $1
        `, [currentUser]);

        console.log(`Permissions for ${currentUser} on user_neighbor:`);
        if (resPerms.rows.length === 0) {
            console.log('None found explicitly.');
        } else {
            console.table(resPerms.rows);
        }

        // 4. Attempt to fix permissions (if we own the table or are superuser)
        try {
            console.log('Attempting to GRANT ALL PRIVILEGES...');
            await query(`GRANT ALL PRIVILEGES ON TABLE user_neighbor TO "${currentUser}"`);
            await query(`GRANT ALL PRIVILEGES ON TABLE community_resource TO "${currentUser}"`);
            // Also need sequence permissions for SERIAL columns
            await query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${currentUser}"`);
            console.log('Grant command executed successfully.');
        } catch (err) {
            console.error('Failed to auto-grant permissions:', err.message);
        }

    } catch (err) {
        console.error('Debug script error:', err);
    } finally {
        await pool.end();
    }
}

debug();
