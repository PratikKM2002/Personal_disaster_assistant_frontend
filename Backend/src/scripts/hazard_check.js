const { query } = require('../config/db');
async function check() {
    const r = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'hazard'");
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit();
}
check();
