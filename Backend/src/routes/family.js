const { parseJson } = require('../utils/json');
const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');

async function familyRoutes(req, res, requireAuth) {
    // -------- FAMILY: JOIN
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/family/join' });
        if (m) {
            const auth = await requireAuth();
            const body = await parseJson(req);
            const { code } = body || {};
            if (!code) return send(res, 400, { error: 'code required' });

            // Validate code format: alphanumeric, underscores, hyphens, 1-30 chars
            const codeStr = String(code).trim();
            if (!/^[A-Za-z0-9_-]{1,30}$/.test(codeStr)) {
                return send(res, 400, { error: 'Invalid code format. Use 1-30 alphanumeric characters.' });
            }

            // First verify the user exists
            const userCheck = await query(`SELECT id, family_id FROM user_account WHERE id = $1`, [auth.uid]);
            if (userCheck.rowCount === 0) return send(res, 404, { error: 'User not found' });

            // Check if user is already in this family
            if (userCheck.rows[0].family_id === codeStr) {
                return send(res, 200, { success: true, family_id: codeStr, action: 'already_member', member_count: 0 });
            }

            const checkRes = await query(`SELECT COUNT(*) as count FROM user_account WHERE family_id = $1`, [codeStr]);
            const countBefore = parseInt(checkRes.rows[0].count, 10);
            const action = countBefore === 0 ? 'created' : 'joined';
            const role = action === 'created' ? 'admin' : 'member';

            await query(`UPDATE user_account SET family_id = $1 WHERE id = $2`, [codeStr, auth.uid]);
            await query(
                `INSERT INTO user_roles_v3 (user_id, role) VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET role = $2`,
                [auth.uid, role]
            );

            // Return the actual count after joining
            const afterRes = await query(`SELECT COUNT(*) as count FROM user_account WHERE family_id = $1`, [codeStr]);
            const countAfter = parseInt(afterRes.rows[0].count, 10);

            send(res, 200, { success: true, family_id: codeStr, action, member_count: countAfter });
            return true;
        }
    }

    // -------- FAMILY: LEAVE
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/family/leave' });
        if (m) {
            const auth = await requireAuth();
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
            const auth = await requireAuth();
            const userRes = await query(
                `SELECT u.family_id, u.name, u.safety_status, u.last_lat, u.last_lon, COALESCE(ur.role, 'member') as role
                 FROM user_account u
                 LEFT JOIN user_roles_v3 ur ON u.id = ur.user_id
                 WHERE u.id=$1`, [auth.uid]);
            if (userRes.rowCount === 0) return send(res, 404, { error: 'User not found' });
            const family_id = userRes.rows[0].family_id;
            const myRole = userRes.rows[0].role;

            if (!family_id) {
                return send(res, 200, { family_id: null, members: [], my_role: myRole });
            }

            const r = await query(
                `SELECT u.id, u.name, u.email, u.phone, u.last_lat, u.last_lon, u.last_address, u.safety_status, 
                  u.battery_level, u.last_location_update, u.safety_message, COALESCE(ur.role, 'member') as role
           FROM user_account u
           LEFT JOIN user_roles_v3 ur ON u.id = ur.user_id
           WHERE u.family_id = $1 AND u.id != $2`,
                [family_id, auth.uid]
            );
            send(res, 200, { family_id, members: r.rows, my_role: myRole });
            return true;
        }
    }

    // -------- FAMILY: REMOVE MEMBER (admin only)
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/family/remove' });
        if (m) {
            const auth = await requireAuth();
            const body = await parseJson(req);
            const { memberId } = body || {};
            if (!memberId) return send(res, 400, { error: 'memberId required' });

            // Check caller is admin of their family
            const roleRes = await query(
                `SELECT ur.role, u.family_id FROM user_account u
                 LEFT JOIN user_roles_v3 ur ON u.id = ur.user_id
                 WHERE u.id = $1`, [auth.uid]
            );
            if (roleRes.rowCount === 0) return send(res, 404, { error: 'User not found' });
            const { role, family_id } = roleRes.rows[0];
            if (role !== 'admin') return send(res, 403, { error: 'Only admins can remove members' });
            if (!family_id) return send(res, 400, { error: 'You are not in a family group' });

            // Verify target is in the same family
            const targetRes = await query(`SELECT family_id FROM user_account WHERE id = $1`, [memberId]);
            if (targetRes.rowCount === 0 || targetRes.rows[0].family_id !== family_id) {
                return send(res, 404, { error: 'Member not found in your family' });
            }

            // Remove them
            await query(`UPDATE user_account SET family_id = NULL WHERE id = $1`, [memberId]);
            await query(
                `INSERT INTO user_roles_v3 (user_id, role) VALUES ($1, 'member')
                 ON CONFLICT (user_id) DO UPDATE SET role = 'member'`, [memberId]
            );
            send(res, 200, { success: true });
            return true;
        }
    }

    return false;
}

module.exports = { familyRoutes };
