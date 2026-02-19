const fetch = require('node-fetch');

async function testChat() {
    try {
        const response = await fetch('http://localhost:8000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer dev-token'
            },
            body: JSON.stringify({
                message: "What should I do in a flood?",
                lat: 37,
                lon: -122
            })
        });

        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Response:', data.response);
    } catch (err) {
        console.error('Test failed:', err);
    }
}

testChat();
