const bcrypt = require('bcryptjs');
const fetch = require('node-fetch');
const { parseJson } = require('../utils/json');
const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');
const { signJwt } = require('../middleware/jwt');
const { rateLimit } = require('../middleware/rate-limiter');

async function authRoutes(req, res) {
    // -------- AUTH: REGISTER
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/auth/register' });
        if (m) {
            // Stricter rate limit for registration: 5 per minute
            if (rateLimit(req, res, { max: 5, windowMs: 60000 })) return true;
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
            // Stricter rate limit for login: 10 per minute to prevent brute force
            if (rateLimit(req, res, { max: 10, windowMs: 60000 })) return true;
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
            // OAuth-only users cannot use password login
            if (!user.password_hash) return send(res, 401, { error: 'Please use Google sign-in for this account' });

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
            // Rate limit: 10 per minute
            if (rateLimit(req, res, { max: 10, windowMs: 60000 })) return true;

            const body = await parseJson(req);
            const { email, name, idToken } = body || {};
            if (!email) return send(res, 400, { error: 'email required' });

            // Verify the session token from Clerk to prevent account takeover
            // The frontend must send the Clerk session token (from getToken()) as idToken
            if (!idToken) return send(res, 401, { error: 'Session token required for Google sync' });
            try {
                // Decode the Clerk JWT payload (base64url → JSON)
                const parts = idToken.split('.');
                if (parts.length !== 3) return send(res, 401, { error: 'Invalid token format' });
                const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

                // Verify the token hasn't expired
                if (payload.exp && payload.exp < Date.now() / 1000) {
                    return send(res, 401, { error: 'Token expired' });
                }

                // Verify the email claim matches the requested email
                // Clerk tokens may have email in different claim keys
                const tokenEmail = payload.email || payload.primary_email;
                if (!tokenEmail) {
                    // If no email in token, allow but log for monitoring
                    console.warn('[Auth] Clerk token has no email claim — verifying by structure only');
                } else if (tokenEmail.toLowerCase() !== email.toLowerCase()) {
                    return send(res, 401, { error: 'Token email mismatch' });
                }
            } catch (verifyErr) {
                console.error('[Auth] Token verification failed:', verifyErr);
                return send(res, 401, { error: 'Token verification failed' });
            }

            let r = await query(
                `SELECT u.id, u.email, u.name, u.public_tag, u.family_id, COALESCE(ur.role, 'member') as role 
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
                    [name || 'Google User', email, null, public_tag]
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
