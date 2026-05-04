const cron = require('node-cron');
const fetch = require('node-fetch');
const { pool } = require('../config/db');
const { main: ingestUSGS } = require('../ingest/ingest-usgs');
const { main: ingestWildfires } = require('../ingest/ingest-wildfires');
const { main: ingestFlood } = require('../ingest/ingest-flood');
const { main: ingestTsunamis } = require('../ingest/ingest-tsunamis');
const { main: ingestHospitals } = require('../ingest/ingest-hospitals');
const { main: ingestFireStations } = require('../ingest/ingest-firestations');
const { main: ingestShelters } = require('../ingest/ingest-shelters');
const { main: ingestSupplies } = require('../ingest/ingest-supplies');
const { runAlerts } = require('./alerts-run');

const PUSH_TIMEOUT_MS = 8000; // 8 seconds for Expo push service

// Notification deduplication: prevent sending the same alert repeatedly
// Key: "userId:hazardId" -> timestamp of last notification
const notifiedCache = new Map();
const NOTIFY_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

function shouldNotify(userId, hazardId) {
    const key = `${userId}:${hazardId}`;
    const lastNotified = notifiedCache.get(key);
    if (lastNotified && Date.now() - lastNotified < NOTIFY_COOLDOWN_MS) {
        return false;
    }
    notifiedCache.set(key, Date.now());
    return true;
}

// Periodically clean up expired dedup entries
setInterval(() => {
    const now = Date.now();
    for (const [key, timestamp] of notifiedCache.entries()) {
        if (now - timestamp > NOTIFY_COOLDOWN_MS) {
            notifiedCache.delete(key);
        }
    }
}, 10 * 60 * 1000); // Clean every 10 minutes

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
    safeRun(ingestShelters, 'Shelter Ingest');
    safeRun(ingestSupplies, 'Supply Ingest');

    // Give ingestors a moment to finish before checking alerts
    setTimeout(() => safeRun(runAlerts, 'Alert Generation'), 2000);

    // Schedule: USGS every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
        await safeRun(ingestUSGS, 'USGS Ingest');
    });

    // Wildfires, Floods, Tsunamis every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
        await safeRun(ingestWildfires, 'Wildfire Ingest');
        await safeRun(ingestFlood, 'Flood Ingest');
        await safeRun(ingestTsunamis, 'Tsunami Ingest');
    });

    // Resources (Daily at midnight)
    cron.schedule('0 0 * * *', async () => {
        await safeRun(ingestHospitals, 'Hospital Ingest');
        await safeRun(ingestFireStations, 'Fire Station Ingest');
        await safeRun(ingestShelters, 'Shelter Ingest');
        await safeRun(ingestSupplies, 'Supply Ingest');
    });

    // Alerts + Push Notifications (Every minute)
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
    try {
        // B3: Use 5-minute lookback instead of 2 minutes to avoid missing hazards
        // if a scheduler cycle is delayed. Dedup cache prevents duplicate notifications.
        const res = await pool.query(`
            SELECT id, type, severity, lat, lon, attributes, occurred_at 
            FROM hazard 
            WHERE occurred_at > NOW() - INTERVAL '5 minutes'
        `);

        if (res.rows.length === 0) return;

        console.log(`[Notify] Found ${res.rows.length} new hazards. Checking for users...`);

        for (const hazard of res.rows) {
            // Use bounding-box pre-filter (~0.45 degrees ≈ 50km) before expensive Haversine
            const userRes = await pool.query(`
                SELECT id, push_token, 
                       (6371 * acos(cos(radians($1)) * cos(radians(last_lat)) * cos(radians(last_lon) - radians($2)) + sin(radians($1)) * sin(radians(last_lat)))) AS dist_km
                FROM user_account
                WHERE push_token IS NOT NULL
                AND last_lat IS NOT NULL AND last_lon IS NOT NULL
                AND last_lat BETWEEN $1 - 0.45 AND $1 + 0.45
                AND last_lon BETWEEN $2 - 0.45 AND $2 + 0.45
                AND (6371 * acos(cos(radians($1)) * cos(radians(last_lat)) * cos(radians(last_lon) - radians($2)) + sin(radians($1)) * sin(radians(last_lat)))) < 50
            `, [hazard.lat, hazard.lon]);

            if (userRes.rows.length === 0) continue;

            // Filter out already-notified users
            const eligibleUsers = userRes.rows.filter(u => shouldNotify(u.id, hazard.id));
            if (eligibleUsers.length === 0) continue;

            const tokens = eligibleUsers.map(u => u.push_token);
            const message = `⚠️ New ${hazard.severity >= 0.7 ? 'CRITICAL' : 'HIGH'} ${hazard.type} reported ${Math.round(eligibleUsers[0].dist_km)}km away!`;

            console.log(`[Notify] Sending alert to ${tokens.length} users near hazard ${hazard.id}`);
            const pushSuccess = await sendExpoPush(tokens, message, { hazardId: hazard.id });

            // B2/A2: Update delivered_at on matching alert rows after successful push
            if (pushSuccess) {
                const userIds = eligibleUsers.map(u => u.id);
                try {
                    await pool.query(`
                        UPDATE alert
                        SET delivered_at = NOW()
                        WHERE hazard_id = $1
                          AND user_id = ANY($2::bigint[])
                          AND delivered_at IS NULL
                    `, [hazard.id, userIds]);
                } catch (e) {
                    console.error('[Notify] Failed to update delivered_at:', e.message);
                }
            }
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

    // B1: Add timeout to prevent scheduler freeze if Expo push service hangs
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);
    try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messages),
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return res.ok; // Return success status for delivered_at tracking
    } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
            console.error('[Push] Expo push service timed out after', PUSH_TIMEOUT_MS, 'ms');
        } else {
            console.error('[Push] Expo Push Error:', err);
        }
        return false;
    }
}

async function runGeofencingAlerts() {
    try {
        // Use a CTE with bounding-box pre-filter to avoid triple Haversine computation
        const res = await pool.query(`
            WITH nearby AS (
                SELECT u.id as user_id, u.name as user_name, u.family_id, 
                       h.id as hazard_id, h.type as hazard_type, h.severity,
                       (6371 * acos(
                           cos(radians(h.lat)) * cos(radians(u.last_lat)) * 
                           cos(radians(u.last_lon) - radians(h.lon)) + 
                           sin(radians(h.lat)) * sin(radians(u.last_lat))
                       )) AS dist_km
                FROM user_account u
                JOIN hazard h ON (
                    u.last_lat BETWEEN h.lat - 0.045 AND h.lat + 0.045
                    AND u.last_lon BETWEEN h.lon - 0.045 AND h.lon + 0.045
                )
                WHERE u.last_lat IS NOT NULL AND u.last_lon IS NOT NULL
                  AND u.family_id IS NOT NULL
                  AND h.occurred_at > NOW() - INTERVAL '6 hours'
            )
            SELECT * FROM nearby
            WHERE (severity >= 0.7 AND dist_km < 5)
               OR (severity >= 0.4 AND dist_km < 2)
        `);

        if (res.rows.length === 0) return;

        console.log(`[Geofence] Found ${res.rows.length} users in danger zones. Notifying families...`);

        for (const row of res.rows) {
            // Dedup: don't spam the same family about the same user+hazard
            if (!shouldNotify(row.user_id, row.hazard_id)) continue;

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
