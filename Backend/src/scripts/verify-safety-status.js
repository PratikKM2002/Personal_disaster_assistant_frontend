const { query } = require('../config/db');
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:8000';
const TEST_USER = {
    name: 'Safety Tester',
    email: 'safety_test@example.com',
    password: 'password123',
    phone: '1234567890'
};

async function testStatusUpdate() {
    console.log('--- Starting Safety Status Verification ---');

    // 1. Try Register/Login
    let token = '';
    let userId = '';

    console.log('Attempting registration...');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
    });

    if (regRes.ok) {
        const data = await regRes.json();
        token = data.token;
        userId = data.user.id;
        console.log('Registered new test user.');
    } else {
        console.log('Registration failed (might exist), attempting login...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_USER.email, password: TEST_USER.password })
        });

        if (!loginRes.ok) {
            console.error('Login failed:', await loginRes.text());
            process.exit(1);
        }

        const data = await loginRes.json();
        token = data.token;
        userId = data.user.id;
        console.log('Logged in existing test user.');
    }

    // 2. Update Status with Message
    const message = "TEST_MESSAGE_" + Date.now();
    const status = "needs-help";

    console.log(`Updating status to '${status}' with message: "${message}"`);

    const statusRes = await fetch(`${BASE_URL}/user/status`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            lat: 40.7128,
            lon: -74.0060,
            status: status,
            battery_level: 75,
            message: message
        })
    });

    if (!statusRes.ok) {
        console.error('Status update failed:', await statusRes.text());
        process.exit(1);
    }
    console.log('Status update API returned success.');

    // 3. Verify in DB
    const result = await query('SELECT safety_status, safety_message FROM user_account WHERE id = $1', [userId]);
    const record = result.rows[0];
    console.log('DB Record:', record);

    if (record.safety_status === status && record.safety_message === message) {
        console.log('✅ SUCCESS: Status and Message verification passed.');
    } else {
        console.error('❌ FAILURE: DB record does not match expected values.');
        console.error(`Expected Status: ${status}, Got: ${record.safety_status}`);
        console.error(`Expected Message: ${message}, Got: ${record.safety_message}`);
        process.exit(1);
    }
}

testStatusUpdate().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
