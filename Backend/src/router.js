const { send } = require('./utils/send');
const { getUserFromAuthHeader } = require('./middleware/clerk-auth');

const { authRoutes } = require('./routes/auth');
const { chatRoutes } = require('./routes/chat');
const { hazardRoutes } = require('./routes/hazards');
const { familyRoutes } = require('./routes/family');
const { userRoutes } = require('./routes/user');
const { communityRoutes } = require('./routes/community');
const { alertRoutes } = require('./routes/alerts');
const { shelterRoutes } = require('./routes/shelters');
const { sosRoutes } = require('./routes/sos');
const { uploadEncryptedFileToS3, previewDocument, downloadDocument, listDocuments, deleteDocument } = require('./routes/documents');

async function router(req, res) {
  try {
    // Cache the auth result so we don't decode + DB-lookup multiple times per request
    let cachedAuth = undefined;
    const requireAuth = async () => {
      if (cachedAuth !== undefined) {
        if (!cachedAuth) {
          const err = new Error('Unauthorized');
          err.status = 401;
          throw err;
        }
        return cachedAuth;
      }
      cachedAuth = await getUserFromAuthHeader(req);
      if (!cachedAuth) {
        cachedAuth = null; // Mark as resolved but unauthorized
        const err = new Error('Unauthorized');
        err.status = 401;
        throw err;
      }
      return cachedAuth;
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
    if (await sosRoutes(req, res, requireAuth)) return;
    if (await uploadEncryptedFileToS3(req, res, requireAuth)) return;
    if (await previewDocument(req, res, requireAuth)) return;
    if (await downloadDocument(req, res, requireAuth)) return;
    if (await listDocuments(req, res, requireAuth)) return;
    if (await deleteDocument(req, res, requireAuth)) return;

    return send(res, 404, { error: 'Not Found' });

  } catch (e) {
    console.error('[Router Error]', e);
    const status = e.status || 500;
    const isExpected = e.status && e.status < 500;
    return send(res, status, { error: isExpected ? e.message : 'Internal Server Error' });
  }
}

module.exports = router;
