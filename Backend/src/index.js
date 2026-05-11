const { ENV } = require('./config/env');
const { createServer } = require('./server');
const { startScheduler } = require('./jobs/scheduler');
const { query } = require('./config/db');

// Ensure critical tables exist at startup (no-op if already present)
async function ensureCriticalTables() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS user_roles_v3 (
        user_id BIGINT PRIMARY KEY REFERENCES user_account(id) ON DELETE CASCADE,
        role TEXT NOT NULL DEFAULT 'member'
      );
    `);
    console.log('[Boot] user_roles_v3 table ensured');
  } catch (err) {
    console.error('[Boot] Failed to ensure user_roles_v3:', err.message);
  }
}

const server = createServer();

// Start server after ensuring tables
ensureCriticalTables().then(() => {
  server.listen(ENV.port, '0.0.0.0', () => {
    console.log(`HTTP server running on :${ENV.port}`);

    // Don't run background jobs during tests / CI
    if (process.env.DISABLE_SCHEDULER !== 'true') {
      startScheduler();
    }
  });
});