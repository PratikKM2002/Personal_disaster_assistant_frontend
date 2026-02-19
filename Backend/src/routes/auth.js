const bcrypt = require('bcryptjs');
const { parseJson } = require('../utils/json');
const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');
const { signJwt } = require('../middleware/jwt');

async function authRoutes(req, res) {
    // -------- AUTH: REGISTER
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/auth/register' });
        if (m) {
            const body = await parseJson(req);
            const { name, email, password, phone } = body || {};
            if (!name || !email || !password) return send(res, 400, { error: 'name, email, password required' });

            const hash = await bcrypt.hash(password, 10);
            const public_tag = require('crypto').randomBytes(3).toString('hex').toUpperCase();

            try {
                const result = await query(
                    `INSERT INTO user_account(name,email,password_hash,phone,public_tag)
             VALUES ($1,$2,$3,$4,$5) RETURNING id,name,email,public_tag`,
                    [name, email, hash, phone || null, public_tag]
                );
                const user = result.rows[0];
                const token = signJwt({ uid: user.id, email: user.email, role: 'member' });
                send(res, 201, { user, token });
                return true;
            } catch (e) {
                if (e.code === '23505') return send(res, 409, { error: 'email or tag already exists' });
                throw e;
            }
        }
    }

    // -------- AUTH: LOGIN
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/auth/login' });
        if (m) {
            const body = await parseJson(req);
            const { email, password } = body || {};
            if (!email || !password) return send(res, 400, { error: 'email, password required' });

            const r = await query(
                `SELECT u.id, u.email, u.password_hash, u.name, COALESCE(ur.role, 'member') as role 
           FROM user_account u 
           LEFT JOIN user_roles_v3 ur ON u.id = ur.user_id 
           WHERE u.email=$1`,
                [email]
            );
            if (r.rowCount === 0) return send(res, 401, { error: 'invalid credentials' });

            const user = r.rows[0];
            const ok = await bcrypt.compare(password, user.password_hash);
            if (!ok) return send(res, 401, { error: 'invalid credentials' });

            const token = signJwt({ uid: user.id, email: user.email, role: user.role });
            delete user.password_hash;
            send(res, 200, { user, token });
            return true;
        }
    }

    // -------- AUTH: GOOGLE SYNC
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/auth/google-sync' });
        if (m) {
            const body = await parseJson(req);
            const { email, name } = body || {};
            if (!email) return send(res, 400, { error: 'email required' });

            let r = await query(
                `SELECT u.id, u.email, u.name, COALESCE(ur.role, 'member') as role 
           FROM user_account u 
           LEFT JOIN user_roles_v3 ur ON u.id = ur.user_id 
           WHERE u.email=$1`,
                [email]
            );

            let user;
            if (r.rowCount === 0) {
                const public_tag = require('crypto').randomBytes(3).toString('hex').toUpperCase();
                const insertRes = await query(
                    `INSERT INTO user_account(name, email, password_hash, public_tag)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, email, public_tag`,
                    [name || 'Google User', email, 'google-oauth-user', public_tag]
                );
                user = insertRes.rows[0];
            } else {
                user = r.rows[0];
            }

            const token = signJwt({ uid: user.id, email: user.email, role: user.role || 'member' });
            send(res, 200, { user, token });
            return true;
        }
    }

    return false;
}

module.exports = { authRoutes };
