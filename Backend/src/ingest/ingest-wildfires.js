const fetch = require('node-fetch');
const { query } = require('../config/db');

// NIFC URL
const BASE_URL = 'https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/WFIGS_Incident_Locations/FeatureServer/0';

async function fetchWildfires() {
    console.log('Fetching NIFC Wildfires...');
    const queryUrl = `${BASE_URL}/query?where=1%3D1&outFields=UniqueFireIdentifier,IncidentName,IncidentSize,PercentContained,POOCounty,POOState,OBJECTID,FireDiscoveryDateTime&orderByFields=FireDiscoveryDateTime DESC&f=json&resultRecordCount=500`;

    const res = await fetch(queryUrl, { headers: { 'user-agent': 'pda-backend/1.0' } });
    if (!res.ok) throw new Error(`Wildfire fetch failed: ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(`ArcGIS Error: ${json.error.code} ${json.error.message}`);
    return json;
}

async function upsertWildfire(feature) {
    const p = feature.attributes || {};
    const g = feature.geometry || {};

    if (!g || !g.x || !g.y) return;

    const sourceEventId = p.UniqueFireIdentifier || `nifc:${p.OBJECTID}`;
    const title = p.IncidentName || 'Unknown Fire';
    const acres = p.IncidentSize || 0;
    const contained = p.PercentContained || 0;

    let severity = 0.3;
    if (acres > 1000) severity = 0.6;
    if (acres > 10000) severity = 0.9;

    const attributes = {
        title: title,
        place: `${p.POOCounty || ''}, ${p.POOState || ''}`.trim(),
        description: `Acres: ${acres}, Contained: ${contained}%`,
        url: null,
        ...p
    };

    const occurredAt = p.FireDiscoveryDateTime ? new Date(p.FireDiscoveryDateTime).toISOString() : new Date().toISOString();

    await query(`
        INSERT INTO hazard (type, severity, occurred_at, lat, lon, source, source_event_id, attributes)
        VALUES ('wildfire', $1, $2, $3, $4, 'NIFC', $5, $6)
        ON CONFLICT (source, source_event_id) DO UPDATE SET
          severity = EXCLUDED.severity,
          occurred_at = EXCLUDED.occurred_at,
          lat = EXCLUDED.lat,
          lon = EXCLUDED.lon,
          attributes = EXCLUDED.attributes
    `, [severity, occurredAt, g.y, g.x, sourceEventId, attributes]);
}

async function main() {
    try {
        const data = await fetchWildfires();
        if (!data.features || data.features.length === 0) {
            console.log('No features found in NIFC response.');
            return;
        }

        const features = data.features;
        console.log(`Processing ${features.length} wildfires...`);

        // Process in batches
        const BATCH_SIZE = 20;
        for (let i = 0; i < features.length; i += BATCH_SIZE) {
            const batch = features.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(feature => upsertWildfire(feature)));
        }

        console.log(`Successfully ingested ${features.length} wildfires.`);

    } catch (err) {
        console.error('Error ingest wildfires:', err);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };

if (require.main === module) {
    main();
}

module.exports = { main };
