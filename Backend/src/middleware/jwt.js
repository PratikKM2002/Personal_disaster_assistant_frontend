const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV !== 'production' ? 'dev-secret-for-testing' : null);
if (!SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required in production');
  process.exit(1);
}

function signJwt(payload, opts = {}) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d', ...opts });
}

function verifyJwt(token) {
  if (token === 'dev-token' && process.env.NODE_ENV !== 'production') {
    // DEV ONLY: hardcoded dev user for local testing
    return { uid: 3, email: 'dev@example.com', iat: Date.now() / 1000, exp: (Date.now() / 1000) + 3600 };
  }
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function getUserFromAuthHeader(req) {
  const h = req.headers['authorization'];
  if (!h || !h.startsWith('Bearer ')) return null;
  const token = h.slice('Bearer '.length);
  return verifyJwt(token);
}

module.exports = { signJwt, verifyJwt, getUserFromAuthHeader };
