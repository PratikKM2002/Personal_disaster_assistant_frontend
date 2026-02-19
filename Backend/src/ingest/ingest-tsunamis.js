const fetch = require('node-fetch');
const { query } = require('../config/db');

/**
 * Parses a simple Atom/XML feed using regex.
 * Specifically designed for tsunami.gov Atom feeds.
 */
function parseAtom(xml) {
    const entries = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
        const content = match[1];

        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/);
        const updatedMatch = content.match(/<updated>([\s\S]*?)<\/updated>/);
        const summaryMatch = content.match(/<summary>([\s\S]*?)<\/summary>/);
        const pointMatch = content.match(/<georss:point>([\s\S]*?)<\/georss:point>/);
        const idMatch = content.match(/<id>([\s\S]*?)<\/id>/);

        if (titleMatch && idMatch) {
            let lat = null, lon = null;
            if (pointMatch) {
                const parts = pointMatch[1].trim().split(/\s+/);
                lat = parseFloat(parts[0]);
                lon = parseFloat(parts[1]);
            }

            entries.push({
                id: idMatch[1].trim(),
                title: titleMatch[1].trim(),
                updated: updatedMatch ? updatedMatch[1].trim() : new Date().toISOString(),
                summary: summaryMatch ? summaryMatch[1].trim().replace(/<[^>]+>/g, '') : '',
                lat,
                lon
            });
        }
    }
    return entries;
}

function getSeverity(title) {
    const t = title.toLowerCase();
    if (t.includes('warning')) return 0.9;
    if (t.includes('advisory')) return 0.6;
    if (t.includes('watch')) return 0.4;
    if (t.includes('information')) return 0.2;
    return 0.3;
}

async function ingestFeed(url, source) {
    try {
        console.log(`[Tsunami Ingest] Fetching ${source}...`);
        const res = await fetch(url, { headers: { 'user-agent': 'pda-backend/1.0' } });
        if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
        const xml = await res.text();
        const entries = parseAtom(xml);

        console.log(`[Tsunami Ingest] Found ${entries.length} entries from ${source}.`);

        for (const entry of entries) {
            // Only ingest actual alerts (not just info statements if they lack locations)
            if (entry.lat === null || entry.lon === null) continue;

            const severity = getSeverity(entry.title);
            const sourceEventId = entry.id;

            await query(`
                INSERT INTO hazard (type, severity, occurred_at, lat, lon, source, source_event_id, attributes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (source, source_event_id) DO UPDATE
                SET severity = EXCLUDED.severity,
                    occurred_at = EXCLUDED.occurred_at,
                    lat = EXCLUDED.lat,
                    lon = EXCLUDED.lon,
                    attributes = EXCLUDED.attributes
            `, [
                'tsunami',
                severity,
                new Date(entry.updated),
                entry.lat,
                entry.lon,
                source,
                sourceEventId,
                JSON.stringify({
                    title: entry.title,
                    summary: entry.summary,
                    url: entry.id // Usually a URL in Atom
                })
            ]);
        }
    } catch (err) {
        console.error(`[Tsunami Ingest] Error in ${source}:`, err.message);
    }
}

async function main() {
    const feeds = [
        { url: 'https://www.tsunami.gov/events/xml/PAAQAtom.xml', name: 'NOAA NTWC' },
        { url: 'https://www.tsunami.gov/events/xml/PHEBAtom.xml', name: 'NOAA PTWC' }
    ];

    for (const feed of feeds) {
        await ingestFeed(feed.url, feed.name);
    }
    console.log('[Tsunami Ingest] Completed.');
}

if (require.main === module) {
    main().then(() => process.exit(0)).catch(err => {
        console.error(err);
        process.exit(1);
    });
}

module.exports = { main };
