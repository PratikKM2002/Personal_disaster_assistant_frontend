const { query } = require('../config/db');

async function checkData() {
    try {
        console.log('--- USER NEIGHBORS ---');
        const neighbors = await query('SELECT * FROM user_neighbor LIMIT 5');
        console.log(JSON.stringify(neighbors.rows, null, 2));

        console.log('\n--- ACTIVE RESOURCES ---');
        const resources = await query('SELECT id, title, type, user_id FROM community_resource WHERE status = \'active\' LIMIT 5');
        console.log(JSON.stringify(resources.rows, null, 2));

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        process.exit();
    }
}

checkData();
