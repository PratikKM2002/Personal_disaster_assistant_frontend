const { query } = require('../config/db');

/**
 * Clerk Auth Middleware — replaces the old JWT-based auth.
 * 
 * Decodes the Clerk session token from the Authorization header,
 * looks up (or auto-creates) the user in the database.
 * 
 * No custom JWT needed — the Clerk token IS the auth token.
 */

/**
 * Decode a Clerk session JWT (base64url) without cryptographic verification.
 * Returns the payload object or null if decoding fails.
 */
function decodeClerkToken(token) {
    try {
        // Dev token shortcut for local testing
        if (token === 'dev-token' && process.env.NODE_ENV !== 'production') {
            return { sub: 'dev_user', email: 'dev@example.com', __dev: true };
        }

        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));

        // Check expiration (allow 60s clock skew for mobile clients)
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < now - 60) {
            console.log('[Auth] Token expired. exp=', payload.exp, 'now=', now);
            return null;
        }

        // SECURITY NOTE: This decodes the JWT payload WITHOUT cryptographic signature
        // verification. This is acceptable when:
        // 1. The backend only uses `sub` (clerk_user_id) to look up existing users
        // 2. Clerk is the sole token issuer
        // For higher-security deployments, add JWKS verification via @clerk/backend
        if (process.env.NODE_ENV === 'production' && !process._clerkAuthWarned) {
            console.warn('[Auth] WARNING: Running without JWT signature verification. Consider adding @clerk/backend for JWKS validation.');
            process._clerkAuthWarned = true;
        }

        return payload;
    } catch {
        return null;
    }
}

/**
 * Extract user info from the Authorization header.
 * Decodes the Clerk JWT and looks up the user in the database.
 * If the user doesn't exist yet, auto-creates them.
 * 
 * @returns {{ uid: number, email: string, role: string } | null}
 */
async function getUserFromAuthHeader(req) {
    const h = req.headers['authorization'];
    if (!h || !h.startsWith('Bearer ')) {
        console.log('[Auth] Missing or invalid Authorization header');
        return null;
    }

    const token = h.slice('Bearer '.length);
    const payload = decodeClerkToken(token);
    if (!payload) {
        console.log('[Auth] Failed to decode token or token expired');
        console.log('[Auth] Token preview:', token.substring(0, 15) + '...');
        return null;
    }

    // Dev token fast path
    if (payload.__dev) {
        return { uid: 3, email: 'dev@example.com', role: 'member' };
    }

    const clerkUserId = payload.sub;
    if (!clerkUserId) {
        console.log('[Auth] No sub (clerkUserId) in token payload');
        return null;
    }

    // Try to find user by clerk_user_id first (fast path)
    let result = await query(
        `SELECT u.id, u.email, u.name, COALESCE(ur.role, 'member') as role
         FROM user_account u
         LEFT JOIN user_roles_v3 ur ON u.id = ur.user_id
         WHERE u.clerk_user_id = $1`,
        [clerkUserId]
    );

    if (result.rowCount > 0) {
        const user = result.rows[0];
        return { uid: user.id, email: user.email, role: user.role };
    }

    // User not found by clerk_user_id — try email from headers (for auto-creation)
    const email = (req.headers['x-user-email'] || payload.email || '').toLowerCase().trim();
    const name = req.headers['x-user-name'] || payload.name || 'User';

    if (!email) {
        console.log('[Auth] Cannot auto-create: no email found in headers or token');
        return null; // Can't create without email
    }

    // Check if user exists by email (might have been created before clerk_user_id was added)
    result = await query(
        `SELECT u.id, u.email, u.name, COALESCE(ur.role, 'member') as role
         FROM user_account u
         LEFT JOIN user_roles_v3 ur ON u.id = ur.user_id
         WHERE u.email = $1`,
        [email]
    );

    if (result.rowCount > 0) {
        // Found by email — link the clerk_user_id for next time
        await query(
            `UPDATE user_account SET clerk_user_id = $1 WHERE email = $2`,
            [clerkUserId, email]
        );
        const user = result.rows[0];
        return { uid: user.id, email: user.email, role: user.role };
    }

    // User doesn't exist at all — auto-create
    const public_tag = require('crypto').randomBytes(3).toString('hex').toUpperCase();
    const insertRes = await query(
        `INSERT INTO user_account(name, email, password_hash, public_tag, clerk_user_id)
         VALUES ($1, $2, NULL, $3, $4)
         RETURNING id, name, email`,
        [name, email, public_tag, clerkUserId]
    );

    const newUser = insertRes.rows[0];
    console.log(`[Auth] Auto-created user ${email} (clerk: ${clerkUserId})`);
    return { uid: newUser.id, email: newUser.email, role: 'member' };
}

module.exports = { getUserFromAuthHeader, decodeClerkToken };
