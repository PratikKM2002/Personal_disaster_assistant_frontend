const { parseJson } = require('../utils/json');
const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');

async function communityRoutes(req, res, requireAuth) {
    // -------- COMMUNITY: NEIGHBORS
    {
        const m = match(req.method, req.url, { method: 'GET', path: '/community/neighbors' });
        if (m) {
            const auth = requireAuth();
            const r = await query(`
            SELECT u.id, u.name, u.email, u.phone, u.last_lat, u.last_lon, 
                   u.safety_status, u.public_tag, u.last_location_update, u.safety_message
            FROM user_neighbor un
            JOIN user_account u ON un.neighbor_id = u.id
            WHERE un.user_id = $1
        `, [auth.uid]);
            send(res, 200, r.rows);
            return true;
        }
    }

    // -------- COMMUNITY: ADD NEIGHBOR
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/community/neighbors/add' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { tag } = body || {};
            if (!tag) return send(res, 400, { error: 'tag required' });

            const userRes = await query('SELECT id FROM user_account WHERE public_tag = $1', [tag.toUpperCase()]);
            if (userRes.rowCount === 0) return send(res, 404, { error: 'User not found' });

            const neighborId = userRes.rows[0].id;
            if (neighborId === auth.uid) return send(res, 400, { error: 'Cannot add yourself' });

            await query(`INSERT INTO user_neighbor (user_id, neighbor_id) VALUES ($1, $2), ($2, $1) ON CONFLICT DO NOTHING`, [auth.uid, neighborId]);
            send(res, 200, { success: true });
            return true;
        }
    }

    // -------- COMMUNITY: REMOVE NEIGHBOR
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/community/neighbors/remove' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { neighborId } = body || {};
            if (!neighborId) return send(res, 400, { error: 'neighborId required' });

            await query(`DELETE FROM user_neighbor WHERE (user_id = $1 AND neighbor_id = $2) OR (user_id = $2 AND neighbor_id = $1)`, [auth.uid, neighborId]);
            send(res, 200, { success: true });
            return true;
        }
    }

    // -------- COMMUNITY: LIST RESOURCES
    {
        const m = match(req.method, req.url, { method: 'GET', path: '/community/resources' });
        if (m) {
            requireAuth();
            const { lat, lon, radius_km = 50 } = m.query || {};
            let r;
            if (lat && lon) {
                // Earth radius approx 6371km. Radius search using spherical law of cosines
                r = await query(`
                    SELECT r.*, u.name as posted_by, u.public_tag,
                        (6371 * acos(cos(radians($1)) * cos(radians(r.lat)) * cos(radians(r.lon) - radians($2)) + sin(radians($1)) * sin(radians(r.lat)))) AS dist_km
                    FROM community_resource r
                    JOIN user_account u ON r.user_id = u.id
                    WHERE status = 'active'
                    AND (6371 * acos(cos(radians($1)) * cos(radians(r.lat)) * cos(radians(r.lon) - radians($2)) + sin(radians($1)) * sin(radians(r.lat)))) <= $3
                    ORDER BY created_at DESC
                `, [parseFloat(lat), parseFloat(lon), parseFloat(radius_km)]);
            } else {
                r = await query(`
                    SELECT r.*, u.name as posted_by, u.public_tag 
                    FROM community_resource r
                    JOIN user_account u ON r.user_id = u.id
                    WHERE status = 'active'
                    ORDER BY created_at DESC
                `);
            }
            send(res, 200, r.rows);
            return true;
        }
    }

    // -------- COMMUNITY: CREATE RESOURCE
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/community/resources' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { type, title, description, lat, lon } = body || {};
            if (!type || !title || !lat || !lon) return send(res, 400, { error: 'type, title, lat, lon required' });

            const r = await query(`
                INSERT INTO community_resource (user_id, type, title, description, status, lat, lon)
                VALUES ($1, $2, $3, $4, 'active', $5, $6)
                RETURNING *
            `, [auth.uid, type, title, description || '', lat, lon]);
            send(res, 201, r.rows[0]);
            return true;
        }
    }

    // -------- PLACES: CREATE
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/places' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { label, lat, lon } = body || {};
            if (!label || typeof lat !== 'number' || typeof lon !== 'number') return send(res, 400, { error: 'label, lat, lon required' });
            const r = await query(`INSERT INTO user_place(user_id,label,lat,lon) VALUES ($1,$2,$3,$4) RETURNING *`, [auth.uid, label, lat, lon]);
            send(res, 201, r.rows[0]);
            return true;
        }
    }

    // -------- PLACES: LIST
    {
        const m = match(req.method, req.url, { method: 'GET', path: '/places' });
        if (m) {
            const auth = requireAuth();
            const r = await query(`SELECT * FROM user_place WHERE user_id=$1 ORDER BY created_at DESC`, [auth.uid]);
            send(res, 200, r.rows);
            return true;
        }
    }

    return false;
}

module.exports = { communityRoutes };
