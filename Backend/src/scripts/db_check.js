const { query } = require('../config/db');

async function checkSchema() {
    try {
        console.log('--- TABLES ---');
        const tables = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(tables.rows.map(r => r.table_name).join(', '));

        console.log('\n--- user_account COLUMNS ---');
        const userCols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_account'");
        console.log(userCols.rows.map(r => `${r.column_name} (${r.data_type})`).join(', '));

        const resourceTable = tables.rows.find(r => r.table_name === 'community_resource');
        if (resourceTable) {
            console.log('\n--- community_resource COLUMNS ---');
            const resCols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'community_resource'");
            resCols.rows.forEach(r => console.log(`${r.column_name} (${r.data_type})`));
        } else {
            console.log('\n!!! community_resource table NOT FOUND');
        }

        console.log('\n--- SAMPLE USER DATA ---');
        const users = await query("SELECT id, name, public_tag FROM user_account LIMIT 5");
        console.log(JSON.stringify(users.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkSchema();
