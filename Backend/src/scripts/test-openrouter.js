require('dotenv').config();
const fetch = require('node-fetch');

async function testOpenRouter() {
    const key = process.env.OPENROUTER_API_KEY;
    console.log("Testing Key:", key ? (key.substring(0, 10) + "...") : "MISSING");

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${key}`,
                "Content-Type": "application/json",
                "HTTP-Referer": "http://localhost:8000",
                "X-Title": "Personal Disaster Assistant Test",
            },
            body: JSON.stringify({
                "model": "google/gemini-2.0-flash-001",
                "messages": [
                    { "role": "user", "content": "Hello, are you there?" }
                ]
            })
        });

        if (!response.ok) {
            console.error("Status:", response.status);
            console.error("Text:", await response.text());
        } else {
            const data = await response.json();
            console.log("Success:", JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("Request Failed:", e);
    }
}

testOpenRouter();
