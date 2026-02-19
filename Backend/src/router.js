const { send } = require('./utils/send');
const { getUserFromAuthHeader } = require('./middleware/jwt');

const { authRoutes } = require('./routes/auth');
const { chatRoutes } = require('./routes/chat');
const { hazardRoutes } = require('./routes/hazards');
const { familyRoutes } = require('./routes/family');
const { userRoutes } = require('./routes/user');
const { communityRoutes } = require('./routes/community');
const { alertRoutes } = require('./routes/alerts');
const { shelterRoutes } = require('./routes/shelters');

async function router(req, res) {
  try {
    const requireAuth = () => {
      const u = getUserFromAuthHeader(req);
      if (!u) {
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      }
      return u;
    };

    console.log(`[REQUEST] ${req.method} ${req.url}`);

    // Health
    if (req.method === 'GET' && req.url === '/health') {
      return send(res, 200, { ok: true, ts: new Date().toISOString() });
    }

    // Delegate to Modular Routes
    if (await authRoutes(req, res)) return;
    if (await chatRoutes(req, res, requireAuth)) return;
    if (await hazardRoutes(req, res, requireAuth)) return;
    if (await familyRoutes(req, res, requireAuth)) return;
    if (await userRoutes(req, res, requireAuth)) return;
    if (await communityRoutes(req, res, requireAuth)) return;
    if (await alertRoutes(req, res, requireAuth)) return;
    if (await shelterRoutes(req, res, requireAuth)) return;

    return send(res, 404, { error: 'Not Found' });

  } catch (e) {
    console.error('[Router Error]', e);
    const status = e.status || 500;
    return send(res, status, { error: e.message || 'Internal Server Error' });
  }
}

module.exports = router;
