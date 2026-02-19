const { query } = require('../config/db');
const crypto = require('crypto');

async function fixTags() {
    try {
        const users = await query('SELECT id, name FROM user_account WHERE public_tag IS NULL');
        console.log(`Found ${users.rowCount} users without tags.`);

        for (const u of users.rows) {
            const tag = crypto.randomBytes(3).toString('hex').toUpperCase();
            await query('UPDATE user_account SET public_tag = $1 WHERE id = $2', [tag, u.id]);
            console.log(`Updated user ${u.name} (ID: ${u.id}) with tag: ${tag}`);
        }

        console.log('Safe tag update complete.');
    } catch (err) {
        console.error('Update failed:', err);
    } finally {
        process.exit();
    }
}

fixTags();
