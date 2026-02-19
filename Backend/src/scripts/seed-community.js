const { query } = require('../config/db');
const crypto = require('crypto');

function generateTag() {
    // Generate 6 character alphanumeric tag (uppercase)
    return crypto.randomBytes(3).toString('hex').toUpperCase();
}

async function seed() {
    console.log('Seeding community data...');

    try {
        // 1. Assign tags to users who don't have them
        const usersRes = await query('SELECT id, name, public_tag, last_lat, last_lon FROM user_account');
        const users = usersRes.rows;

        for (const user of users) {
            if (!user.public_tag) {
                let tag = generateTag();
                // Simple retry loop for uniqueness (good enough for seed)
                let attempts = 0;
                while (true) {
                    try {
                        await query('UPDATE user_account SET public_tag = $1 WHERE id = $2', [tag, user.id]);
                        console.log(`Assigned tag ${tag} to user ${user.name}`);
                        break;
                    } catch (e) {
                        if (e.code === '23505') { // Unique violation
                            tag = generateTag();
                            attempts++;
                            if (attempts > 5) throw e;
                        } else {
                            throw e;
                        }
                    }
                }
            }
        }

        // Refetch users to get new tags
        const allUsers = (await query('SELECT id, name, last_lat, last_lon FROM user_account')).rows;
        if (allUsers.length < 2) {
            console.log('Not enough users to seed neighbors. skipping.');
            return;
        }

        const mainUser = allUsers[0];

        // 2. Create some neighbor connections
        // Connect mainUser to some others
        for (let i = 1; i < allUsers.length && i < 4; i++) {
            const neighbor = allUsers[i];
            await query(`
                INSERT INTO user_neighbor (user_id, neighbor_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, neighbor_id) DO NOTHING
            `, [mainUser.id, neighbor.id]);
            // Mutual?
            await query(`
                INSERT INTO user_neighbor (user_id, neighbor_id)
                VALUES ($1, $2)
                ON CONFLICT (user_id, neighbor_id) DO NOTHING
            `, [neighbor.id, mainUser.id]);
            console.log(`Connected ${mainUser.name} <-> ${neighbor.name}`);
        }

        // 3. Create dummy resources
        // Clear old test data if needed? No, just append.

        const centerLat = mainUser.last_lat || 34.0522;
        const centerLon = mainUser.last_lon || -118.2437;

        const resources = [
            { type: 'offering', title: 'Bottled Water', desc: 'I have 2 extra cases of water.', offsetLat: 0.002, offsetLon: 0.001 },
            { type: 'requesting', title: 'Flashlight Batteries', desc: 'Need AA batteries for flashlight.', offsetLat: -0.002, offsetLon: -0.001 },
            { type: 'offering', title: 'First Aid Kit', desc: 'Fully stocked kit available.', offsetLat: 0.003, offsetLon: -0.002 },
            { type: 'requesting', title: 'Blankets', desc: 'It is getting cold, need extra blankets.', offsetLat: -0.001, offsetLon: 0.003 },
        ];

        for (const res of resources) {
            // Randomly assign to a user
            const owner = allUsers[Math.floor(Math.random() * allUsers.length)];

            await query(`
                INSERT INTO community_resource (user_id, type, title, description, lat, lon)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                owner.id,
                res.type,
                res.title,
                res.desc,
                centerLat + res.offsetLat,
                centerLon + res.offsetLon
            ]);
        }
        console.log(`Seeded ${resources.length} community resources.`);

        console.log('Seeding complete.');

    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

if (require.main === module) {
    seed().then(() => process.exit(0));
}

module.exports = { seed };
