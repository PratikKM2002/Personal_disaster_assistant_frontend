const cron = require('node-cron');
const fetch = require('node-fetch');
const { pool } = require('../config/db');
const { main: ingestUSGS } = require('../ingest/ingest-usgs');
const { main: ingestWildfires } = require('../ingest/ingest-wildfires');
const { main: ingestFlood } = require('../ingest/ingest-flood');
const { main: ingestTsunamis } = require('../ingest/ingest-tsunamis');
const { main: ingestHospitals } = require('../ingest/ingest-hospitals');
const { main: ingestFireStations } = require('../ingest/ingest-firestations');
const { runAlerts } = require('./alerts-run');

const INGEST_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const WILDFIRE_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
const TSUNAMI_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const RESOURCES_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours (static data mostly)
const ALERTS_INTERVAL_MS = 1 * 60 * 1000; // 1 minute

function startScheduler() {


















































    console.log('[Scheduler] Starting background tasks...');

    // Run immediately
    safeRun(ingestUSGS, 'USGS Ingest');
    safeRun(ingestWildfires, 'Wildfire Ingest');
    safeRun(ingestFlood, 'Flood Ingest');
    safeRun(ingestTsunamis, 'Tsunami Ingest');

    // Resources run once on startup, then daily
    safeRun(ingestHospitals, 'Hospital Ingest');
    safeRun(ingestFireStations, 'Fire Station Ingest');

    // Give ingestors a moment to finish before checking alerts? 
    // Actually alerts-run runs independently, so it's fine.
    setTimeout(() => safeRun(runAlerts, 'Alert Generation'), 2000);

    // Schedule
    // USGS
    cron.schedule('*/5 * * * *', async () => {
        await safeRun(ingestUSGS, 'USGS Ingest');
    });

    // Wildfires
    cron.schedule('*/15 * * * *', async () => {
        await safeRun(ingestWildfires, 'Wildfire Ingest');
        await safeRun(ingestFlood, 'Flood Ingest');
        await safeRun(ingestTsunamis, 'Tsunami Ingest');
    });

    // Tsunamis (Future)
    /*
    cron.schedule('0 *\/1 * * *', async () => {
        await safeRun(ingestTsunamis, 'Tsunami Ingest');
    });
    */

    // Resources (Daily at midnight)
    cron.schedule('0 0 * * *', async () => {
        await safeRun(ingestHospitals, 'Hospital Ingest');
        await safeRun(ingestFireStations, 'Fire Station Ingest');
    });

    // Alerts (Every minute)
    cron.schedule('* * * * *', async () => {
        await safeRun(runAlerts, 'Alert Generation');
        await safeRun(checkAndNotifyHazards, 'Push Notifications');
        await safeRun(runGeofencingAlerts, 'Geofencing Alerts');
    });
}

async function safeRun(fn, name) {
    try {
        console.log(`[Scheduler] Running ${name}...`);
        await fn();
        console.log(`[Scheduler] ${name} completed.`);
    } catch (err) {
        console.error(`[Scheduler] ${name} failed:`, err);
    }
}

async function checkAndNotifyHazards() {
    // 1. Find hazards created in the last minute (or scheduled interval)
    // For robust production, you'd track the last check time in DB. 
    // Here we'll just look back 2 minutes to be safe.
    try {
        const res = await pool.query(`
            SELECT id, type, severity, lat, lon, attributes, occurred_at 
            FROM hazard 
            WHERE occurred_at > NOW() - INTERVAL '2 minutes'
        `);

        if (res.rows.length === 0) return;

        console.log(`[Notify] Found ${res.rows.length} new hazards. Checking for users...`);

        // 2. Find users near these hazards (e.g., 50km) who have a push token
        for (const hazard of res.rows) {
            const userRes = await pool.query(`
                SELECT id, push_token, 
                       (6371 * acos(cos(radians($1)) * cos(radians(last_lat)) * cos(radians(last_lon) - radians($2)) + sin(radians($1)) * sin(radians(last_lat)))) AS dist_km
                FROM user_account
                WHERE push_token IS NOT NULL
                AND last_lat IS NOT NULL AND last_lon IS NOT NULL
                AND (6371 * acos(cos(radians($1)) * cos(radians(last_lat)) * cos(radians(last_lon) - radians($2)) + sin(radians($1)) * sin(radians(last_lat)))) < 50
            `, [hazard.lat, hazard.lon]);

            if (userRes.rows.length === 0) continue;

            const tokens = userRes.rows.map(u => u.push_token);
            const message = `⚠️ New ${hazard.severity} ${hazard.type} reported ${Math.round(userRes.rows[0].dist_km)}km away!`;

            console.log(`[Notify] Sending alert to ${tokens.length} users near hazard ${hazard.id}`);

            // 3. Send to Expo
            await sendExpoPush(tokens, message, { hazardId: hazard.id });
        }
    } catch (err) {
        console.error('[Notify] Error:', err);
    }
}

async function sendExpoPush(tokens, body, data) {
    const messages = tokens.map(token => ({
        to: token,
        sound: 'default',
        title: 'Guardian AI Alert',
        body: body,
        data: data,
    }));

    // Chunking is recommended for large batches, but simple here
    try {
        await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
        });
    } catch (err) {
        console.error('Expo Push Error:', err);
    }
}

async function runGeofencingAlerts() {
    try {
        // 1. Find users currently in a high-risk zone (within 5km of a 'critical' or 2km of 'high' hazard)
        // We look for hazards reported in the last 6 hours to be relevant.
        const res = await pool.query(`
            SELECT u.id as user_id, u.name as user_name, u.family_id, h.type as hazard_type, h.severity,
                   (6371 * acos(cos(radians(h.lat)) * cos(radians(u.last_lat)) * cos(radians(u.last_lon) - radians(h.lon)) + sin(radians(h.lat)) * sin(radians(u.last_lat)))) AS dist_km
            FROM user_account u
            JOIN hazard h ON (6371 * acos(cos(radians(h.lat)) * cos(radians(u.last_lat)) * cos(radians(u.last_lon) - radians(h.lon)) + sin(radians(h.lat)) * sin(radians(u.last_lat)))) < 5
            WHERE u.last_lat IS NOT NULL AND u.last_lon IS NOT NULL
              AND u.family_id IS NOT NULL
              AND h.occurred_at > NOW() - INTERVAL '6 hours'
              AND (
                (h.severity >= 0.7 AND (6371 * acos(cos(radians(h.lat)) * cos(radians(u.last_lat)) * cos(radians(u.last_lon) - radians(h.lon)) + sin(radians(h.lat)) * sin(radians(u.last_lat)))) < 5)
                OR (h.severity >= 0.4 AND (6371 * acos(cos(radians(h.lat)) * cos(radians(u.last_lat)) * cos(radians(u.last_lon) - radians(h.lon)) + sin(radians(h.lat)) * sin(radians(u.last_lat)))) < 2)
              )
        `);

        if (res.rows.length === 0) return;

        console.log(`[Geofence] Found ${res.rows.length} users in danger zones. Notifying families...`);

        for (const row of res.rows) {
            // Find family members (excluding the user themselves)
            const familyRes = await pool.query(`
                SELECT push_token 
                FROM user_account 
                WHERE family_id = $1 AND id != $2 AND push_token IS NOT NULL
            `, [row.family_id, row.user_id]);

            if (familyRes.rows.length === 0) continue;

            const tokens = familyRes.rows.map(f => f.push_token);
            const message = `🚨 EMERGENCY: ${row.user_name} is near a ${row.severity >= 0.7 ? 'CRITICAL' : 'HIGH'} ${row.hazard_type} zone! (${Math.round(row.dist_km * 10) / 10}km away)`;

            console.log(`[Geofence] Notifying ${tokens.length} members for ${row.user_name}`);
            await sendExpoPush(tokens, message, {
                type: 'geofence_alert',
                targetUserId: row.user_id,
                targetUserName: row.user_name,
                hazardType: row.hazard_type
            });
        }

    } catch (err) {
        console.error('[Geofence] Error:', err);
    }
}

module.exports = { startScheduler };

if (require.main === module) {
    startScheduler();
}
