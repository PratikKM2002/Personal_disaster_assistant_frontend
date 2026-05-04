const fetch = require('node-fetch');
const { pool, query } = require('../config/db');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const INGEST_TIMEOUT_MS = 20000; // 20 seconds

// Bay Area Bounding Box
const QUERY = `
[out:json][timeout: 60];
(
    node["shop"~"supermarket|hardware"](37.10, -122.60, 38.00, -121.50);
way["shop"~"supermarket|hardware"](37.10, -122.60, 38.00, -121.50);
node["amenity" = "pharmacy"](37.10, -122.60, 38.00, -121.50);
way["amenity" = "pharmacy"](37.10, -122.60, 38.00, -121.50);
);
out center;
`;

async function fetchSupplies() {
    console.log('Fetching supply locations from Overpass API (Bay Area)...');
    const params = new URLSearchParams();
    params.append('data', QUERY);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INGEST_TIMEOUT_MS);
    try {
        const res = await fetch(OVERPASS_URL, {
            method: 'POST',
            body: params,
            headers: {
                'User-Agent': 'PersonalDisasterAssistant/1.0 (contact@example.com)'
            },
            signal: controller.signal
        });
        clearTimeout(timeout);

        const text = await res.text();
        if (!res.ok) {
            throw new Error(`Overpass API failed: ${ res.status } ${ res.statusText } \nBody: ${ text.substring(0, 200) } `);
        }

        try {
            const data = JSON.parse(text);
            return data.elements || [];
        } catch (e) {
            throw new Error(`Failed to parse JSON: ${ text.substring(0, 100) } `);
        }
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') throw new Error('Overpass supply fetch timed out');
        throw err;
    }
}

async function upsertSupply(client, node) {
    const lat = node.lat || (node.center && node.center.lat);
    const lon = node.lon || (node.center && node.center.lon);

    if (!node.tags || !lat || !lon) return;

    const name = node.tags.name || `${ node.tags.shop || node.tags.amenity || 'Supply' } ${ node.id } `;
    const address = [
        node.tags['addr:housenumber'],
        node.tags['addr:street'],
        node.tags['addr:city'],
        node.tags['addr:state']
    ].filter(Boolean).join(' ') || 'Unknown Address';

    const phone = node.tags.phone || node.tags['contact:phone'] || null;

    // Check existence by Name + Location (Approx)
    const existing = await client.query(
        `SELECT id FROM shelter
WHERE(name = $1 OR(lat BETWEEN $2 - 0.0001 AND $2 + 0.0001 AND lon BETWEEN $3 - 0.0001 AND $3 + 0.0001))
     AND type = 'supply'`,
        [name, lat, lon]
    );

    if (existing.rows.length > 0) {
        const id = existing.rows[0].id;
        await client.query(
            `UPDATE shelter SET
name = $1, address = $2, lat = $3, lon = $4,
    type = 'supply', status = 'active', phone = $5, category = 'supply', updated_at = NOW()
       WHERE id = $6`,
            [name, address, lat, lon, phone, id]
        );
    } else {
        await client.query(
            `INSERT INTO shelter(
        name, address, lat, lon, capacity, type, status, phone, category
    ) VALUES($1, $2, $3, $4, 0, 'supply', 'active', $5, 'supply')`,
            [name, address, lat, lon, phone]
        );
    }
}

async function main() {
    const client = await pool.connect();
    try {
        const elements = await fetchSupplies();
        console.log(`Fetched ${ elements.length } supply elements.`);

        let count = 0;
        await client.query('BEGIN');
        for (const el of elements) {
            if (el.tags) {
                await upsertSupply(client, el);
                count++;
            }
        }
        await client.query('COMMIT');
        console.log(`Successfully ingested ${ count } supply locations.`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error ingest supplies:', err);
    } finally {
        client.release();
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
