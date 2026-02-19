const { parseJson } = require('../utils/json');
const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');
const { reverseGeocode } = require('../utils/geocoding');

async function userRoutes(req, res, requireAuth) {
    // -------- USER: UPDATE STATUS
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/user/status' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { lat, lon, status, battery_level, message } = body || {};
            if (lat === undefined || lon === undefined) return send(res, 400, { error: 'lat and lon required' });

            await query(
                `UPDATE user_account 
           SET last_lat=$1, last_lon=$2, safety_status=$3, battery_level=$4, safety_message=$5, last_location_update=NOW()
           WHERE id=$6`,
                [lat, lon, status || 'safe', battery_level || null, message || null, auth.uid]
            );

            // Optional: Background reverse geocoding
            reverseGeocode(lat, lon).then(addr => {
                if (addr) {
                    query(`UPDATE user_account SET last_address=$1 WHERE id=$2`, [addr, auth.uid]).catch(e => console.error('[User] Geocode update fail:', e));
                }
            }).catch(e => console.error('[User] Geocode start fail:', e));

            send(res, 200, { success: true });
            return true;
        }
    }

    // -------- USER: UPDATE PUSH TOKEN
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/user/push-token' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { token } = body || {};
            if (!token) return send(res, 400, { error: 'token required' });
            await query('UPDATE user_account SET push_token=$1 WHERE id=$2', [token, auth.uid]);
            send(res, 200, { success: true });
            return true;
        }
    }

    // -------- USER: ME (with profile data + contacts)
    {
        const m = match(req.method, req.url, { method: 'GET', path: '/user/me' });
        if (m) {
            const auth = requireAuth();
            const r = await query(
                `SELECT u.id, u.name, u.email, u.phone, u.public_tag, u.safety_status, 
                    u.last_lat, u.last_lon, u.blood_type,
                    COALESCE(ur.role, 'member') as role 
             FROM user_account u
             LEFT JOIN user_roles_v3 ur ON u.id = ur.user_id
             WHERE u.id=$1`,
                [auth.uid]
            );
            if (r.rowCount === 0) return send(res, 404, { error: 'User not found' });

            // Fetch emergency contacts
            const contactsRes = await query(
                `SELECT id, name, phone, relationship, is_primary FROM emergency_contact WHERE user_id=$1 ORDER BY is_primary DESC, id`,
                [auth.uid]
            );

            const user = r.rows[0];
            user.contacts = contactsRes.rows;

            send(res, 200, user);
            return true;
        }
    }

    // -------- USER: UPDATE PROFILE (phone, blood_type)
    {
        const m = match(req.method, req.url, { method: 'PUT', path: '/user/profile' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { phone, blood_type } = body || {};

            const sets = [];
            const vals = [];
            let idx = 1;

            if (phone !== undefined) { sets.push(`phone=$${idx++}`); vals.push(phone); }
            if (blood_type !== undefined) { sets.push(`blood_type=$${idx++}`); vals.push(blood_type); }

            if (sets.length === 0) return send(res, 400, { error: 'Nothing to update' });

            vals.push(auth.uid);
            await query(`UPDATE user_account SET ${sets.join(', ')} WHERE id=$${idx}`, vals);
            send(res, 200, { success: true });
            return true;
        }
    }

    // -------- USER: ADD EMERGENCY CONTACT
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/user/contacts' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { name, phone, relationship, is_primary } = body || {};
            if (!name || !phone) return send(res, 400, { error: 'name and phone required' });

            const r = await query(
                `INSERT INTO emergency_contact(user_id, name, phone, relationship, is_primary) 
                 VALUES($1, $2, $3, $4, $5) RETURNING id, name, phone, relationship, is_primary`,
                [auth.uid, name, phone, relationship || null, is_primary || false]
            );
            send(res, 201, r.rows[0]);
            return true;
        }
    }

    // -------- USER: DELETE EMERGENCY CONTACT
    {
        const m = match(req.method, req.url, { method: 'DELETE', path: '/user/contacts/:id' });
        if (m) {
            const auth = requireAuth();
            const contactId = m.params.id;
            await query('DELETE FROM emergency_contact WHERE id=$1 AND user_id=$2', [contactId, auth.uid]);
            send(res, 200, { success: true });
            return true;
        }
    }

    return false;
}

module.exports = { userRoutes };
