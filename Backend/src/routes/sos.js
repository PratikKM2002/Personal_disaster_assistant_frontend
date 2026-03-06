const { parseJson } = require('../utils/json');
const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');
const fetch = require('node-fetch');

async function sosRoutes(req, res, requireAuth) {
    // -------- SOS: TRIGGER EMERGENCY
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/sos' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { lat, lon } = body || {};
            if (lat === undefined || lon === undefined) {
                return send(res, 400, { error: 'lat and lon required' });
            }

            // 1. Update the user's safety status to 'danger'
            await query(
                `UPDATE user_account SET safety_status='danger', last_lat=$1, last_lon=$2, last_location_update=NOW() WHERE id=$3`,
                [lat, lon, auth.uid]
            );

            // 2. Get the user's name and family_id
            const userRes = await query(
                `SELECT name, family_id FROM user_account WHERE id=$1`,
                [auth.uid]
            );
            if (userRes.rowCount === 0) return send(res, 404, { error: 'User not found' });

            const { name, family_id } = userRes.rows[0];
            let notified = 0;

            if (family_id) {
                // 3. Find all family members with push tokens (excluding self)
                const familyRes = await query(
                    `SELECT push_token FROM user_account WHERE family_id=$1 AND id!=$2 AND push_token IS NOT NULL`,
                    [family_id, auth.uid]
                );

                if (familyRes.rows.length > 0) {
                    const tokens = familyRes.rows.map(r => r.push_token);
                    const message = `🚨 SOS: ${name} needs help! Tap for their location.`;

                    // 4. Send high-priority push notification via Expo
                    const messages = tokens.map(token => ({
                        to: token,
                        sound: 'default',
                        title: '🚨 EMERGENCY SOS',
                        body: message,
                        priority: 'high',
                        channelId: 'emergency',
                        data: {
                            type: 'sos',
                            userId: auth.uid,
                            userName: name,
                            lat,
                            lon,
                        },
                    }));

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
                        notified = tokens.length;
                        console.log(`[SOS] ${name} triggered SOS. Notified ${notified} family members.`);
                    } catch (err) {
                        console.error('[SOS] Push notification failed:', err);
                    }
                }
            }

            send(res, 200, { success: true, notified });
            return true;
        }
    }

    return false;
}

module.exports = { sosRoutes };
