const { parseJson } = require('../utils/json');
const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');

async function familyRoutes(req, res, requireAuth) {
    // -------- FAMILY: JOIN
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/family/join' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { code } = body || {};
            if (!code) return send(res, 400, { error: 'code required' });

            const checkRes = await query(`SELECT COUNT(*) as count FROM user_account WHERE family_id = $1`, [code]);
            const countBefore = parseInt(checkRes.rows[0].count, 10);
            const action = countBefore === 0 ? 'created' : 'joined';
            const role = action === 'created' ? 'admin' : 'member';

            await query(`UPDATE user_account SET family_id = $1 WHERE id = $2`, [code, auth.uid]);
            await query(
                `INSERT INTO user_roles_v3 (user_id, role) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET role = $2`,
                [auth.uid, role]
            );
            send(res, 200, { success: true, family_id: code, action, member_count: countBefore + 1 });
            return true;
        }
    }

    // -------- FAMILY: LEAVE
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/family/leave' });
        if (m) {
            const auth = requireAuth();
            await query(`UPDATE user_account SET family_id = NULL WHERE id = $1`, [auth.uid]);
            await query(
                `INSERT INTO user_roles_v3 (user_id, role) VALUES ($1, 'member')
           ON CONFLICT (user_id) DO UPDATE SET role = 'member'`,
                [auth.uid]
            );
            send(res, 200, { success: true });
            return true;
        }
    }

    // -------- FAMILY: GET MEMBERS
    {
        const m = match(req.method, req.url, { method: 'GET', path: '/family' });
        if (m) {
            const auth = requireAuth();
            const userRes = await query(`SELECT family_id FROM user_account WHERE id=$1`, [auth.uid]);
            if (userRes.rowCount === 0) return send(res, 404, { error: 'User not found' });
            const family_id = userRes.rows[0].family_id;

            if (!family_id) {
                return send(res, 200, { family_id: null, members: [] });
            }

            const r = await query(
                `SELECT u.id, u.name, u.email, u.phone, u.last_lat, u.last_lon, u.last_address, u.safety_status, 
                  u.battery_level, u.last_location_update, u.safety_message, COALESCE(ur.role, 'member') as role
           FROM user_account u
           LEFT JOIN user_roles_v3 ur ON u.id = ur.user_id
           WHERE u.family_id = $1 AND u.id != $2`,
                [family_id, auth.uid]
            );
            send(res, 200, { family_id, members: r.rows });
            return true;
        }
    }

    return false;
}

module.exports = { familyRoutes };
