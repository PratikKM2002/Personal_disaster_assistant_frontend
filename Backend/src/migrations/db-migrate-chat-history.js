const { query } = require('../config/db');

async function migrate() {
  try {
    console.log('Migrating database: creating chat_history table...');

    // Drop first to fix schema mismatch (UUID vs BIGINT)
    await query(`DROP TABLE IF EXISTS chat_history;`);

    // Creates the chat_history table with correct BIGINT type for user_id to match user_account.id
    await query(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL, 
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add index
    await query(`CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);`);

    // Grant permissions to the user specified in .env (pda_user)
    await query(`GRANT ALL PRIVILEGES ON TABLE chat_history TO pda_user;`);
    await query(`GRANT USAGE, SELECT ON SEQUENCE chat_history_id_seq TO pda_user;`);

    console.log('Migration complete: chat_history table created and permissions granted.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
