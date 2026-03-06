const http = require('http');
const router = require('./router');
const { rateLimit } = require('./middleware/rate-limiter');

function createServer() {
  return http.createServer(async (req, res) => {
    // basic security headers
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-frame-options', 'DENY');

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Bypass-Tunnel-Reminder');

    // Handle Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Rate limiting — 100 requests per minute per IP
    if (rateLimit(req, res)) return;

    await router(req, res);
  });
}

module.exports = { createServer };
