const { query } = require('../config/db');
const { fetchFloodRisk } = require('../services/flood');

/**
 * Ingest flood data for:
 * 1. All active users' last known locations
 * 2. Major river basins/cities (Sentinel nodes)
 */
async function main() {
    console.log('[Flood Ingest] Starting automated ingest...');

    try {
        // 1. Get unique last locations from active users (last 24h)
        const userLocsRes = await query(`
            SELECT DISTINCT last_lat, last_lon 
            FROM user_account 
            WHERE last_lat IS NOT NULL 
              AND last_location_update > NOW() - INTERVAL '24 hours'
        `);

        const locs = userLocsRes.rows.map(r => ({ lat: r.last_lat, lon: r.last_lon }));

        // 2. Add sentinel locations (e.g., major flood-prone cities)
        const sentinels = [
            { lat: 29.95, lon: -90.07 }, // New Orleans
            { lat: 38.62, lon: -90.19 }, // St. Louis (Mississippi River)
            { lat: 45.52, lon: -122.67 }, // Portland (Columbia River)
            { lat: 30.26, lon: -97.74 }, // Austin (Flash flood alley)
        ];

        // Combine and deduplicate roughly (by 0.1 degree)
        const allLocs = [...locs, ...sentinels];
        const processed = new Set();

        for (const loc of allLocs) {
            const key = `${Math.round(loc.lat * 10) / 10}_${Math.round(loc.lon * 10) / 10}`;
            if (processed.has(key)) continue;
            processed.add(key);

            console.log(`[Flood Ingest] Checking ${loc.lat}, ${loc.lon}...`);
            // fetchFloodRisk already handles saving High Risk to DB
            await fetchFloodRisk(loc.lat, loc.lon);

            // Sleep briefly to be nice to the API
            await new Promise(r => setTimeout(r, 1000));
        }

        console.log(`[Flood Ingest] Completed checking ${processed.size} locations.`);
    } catch (err) {
        console.error('[Flood Ingest] Failed:', err);
    }
}

if (require.main === module) {
    main().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { main };
