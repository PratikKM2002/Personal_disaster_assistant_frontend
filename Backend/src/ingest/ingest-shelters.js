const fetch = require('node-fetch');
const { pool, query } = require('../config/db');

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
// Bay Area Bounding Box
const QUERY = `
[out:json][timeout:25];
(
  node["amenity"~"community_centre|townhall|school"](37.10,-122.60,38.00,-121.50);
  way["amenity"~"community_centre|townhall|school"](37.10,-122.60,38.00,-121.50);
  relation["amenity"~"community_centre|townhall|school"](37.10,-122.60,38.00,-121.50);
  node["shelter_type"="emergency"](37.10,-122.60,38.00,-121.50);
  way["shelter_type"="emergency"](37.10,-122.60,38.00,-121.50);
  node["social_facility"="shelter"](37.10,-122.60,38.00,-121.50);
);
out center;
`;

const INGEST_TIMEOUT_MS = 20000; // 20 seconds

async function fetchShelters() {
  console.log('Fetching shelters from Overpass API (Bay Area)...');
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

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Overpass API failed: ${res.status} ${res.statusText}\nBody: ${text.substring(0, 200)}`);
    }

    const data = await res.json();
    return data.elements || [];
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Overpass shelter fetch timed out');
    throw err;
  }
}

async function upsertShelter(client, node) {
  const lat = node.lat || (node.center && node.center.lat);
  const lon = node.lon || (node.center && node.center.lon);

  if (!node.tags || !lat || !lon) return;

  const name = node.tags.name || `${node.tags.amenity || 'Shelter'} ${node.id}`;
  const address = [
    node.tags['addr:housenumber'],
    node.tags['addr:street'],
    node.tags['addr:city'],
    node.tags['addr:state']
  ].filter(Boolean).join(' ') || 'Unknown Address';

  const phone = node.tags.phone || node.tags['contact:phone'] || null;
  const capacity = parseInt(node.tags.capacity, 10) || 0;

  // Use ON CONFLICT to handle duplicates cleanly
  await client.query(
    `INSERT INTO shelter (name, address, lat, lon, capacity, type, status, phone, category)
     VALUES ($1, $2, $3, $4, $5, 'shelter', 'active', $6, 'emergency_shelter')
     ON CONFLICT (name, lat, lon) DO UPDATE SET
       address = EXCLUDED.address,
       capacity = EXCLUDED.capacity,
       phone = EXCLUDED.phone,
       category = 'emergency_shelter',
       status = 'active',
       updated_at = NOW()`,
    [name, address, lat, lon, capacity, phone]
  );
}

async function main() {
  const client = await pool.connect();
  try {
    const elements = await fetchShelters();
    console.log(`Fetched ${elements.length} shelter elements.`);

    let count = 0;
    await client.query('BEGIN');
    for (const el of elements) {
      if (el.tags) {
        await upsertShelter(client, el);
        count++;
      }
    }
    await client.query('COMMIT');
    console.log(`Successfully ingested ${count} shelters.`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error ingest shelters:', err);
  } finally {
    client.release();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
