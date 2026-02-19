const fetch = require('node-fetch');
const { parseJson } = require('../utils/json');
const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');

async function chatRoutes(req, res, requireAuth) {
    // -------- CHAT: SEND MESSAGE
    {
        const m = match(req.method, req.url, { method: 'POST', path: '/chat' });
        if (m) {
            const auth = requireAuth();
            const body = await parseJson(req);
            const { message, lat, lon } = body || {};

            if (!message) return send(res, 400, { error: 'message required' });

            // 1. Fetch Context (Hazards near user)
            let contextStr = "No major hazards reported nearby.";
            if (lat && lon) {
                const hazardsRes = await query(`
                    SELECT type, severity, attributes->>'title' as title
                    FROM hazard
                    WHERE (6371 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lon) - radians($2)) + sin(radians($1)) * sin(radians(lat)))) <= 50
                    ORDER BY occurred_at DESC
                    LIMIT 3
                `, [lat, lon]);

                if (hazardsRes.rows.length > 0) {
                    contextStr = "Current hazards nearby:\n" + hazardsRes.rows.map(h => `- ${h.severity} ${h.type}: ${h.title}`).join('\n');
                }
            }

            // 2. Call OpenRouter
            const key = process.env.OPENROUTER_API_KEY;
            if (!key) {
                console.error("[Chat] OPENROUTER_API_KEY missing");
                return send(res, 500, { error: 'AI Service currently unavailable' });
            }

            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${key}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "http://localhost:8000",
                        "X-Title": "Personal Disaster Assistant",
                    },
                    body: JSON.stringify({
                        "model": "google/gemini-2.0-flash-001",
                        "messages": [
                            {
                                "role": "system",
                                "content": `You are Guardian AI, a specialized disaster response and preparedness assistant. 
                                Provide calm, expert, and actionable advice to help users stay safe during emergencies.
                                Use the following real-time context if available:
                                ${contextStr}`
                            },
                            { "role": "user", "content": message }
                        ]
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error("[Chat] OpenRouter Error:", response.status, errorText);
                    return send(res, 502, { error: 'AI provider error' });
                }

                const data = await response.json();
                const aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

                // 3. Save to History (Optional but good)
                try {
                    await query(`INSERT INTO chat_history (user_id, role, content) VALUES ($1, 'user', $2)`, [auth.uid, message]);
                    await query(`INSERT INTO chat_history (user_id, role, content) VALUES ($1, 'assistant', $2)`, [auth.uid, aiResponse]);
                } catch (historyErr) {
                    console.error("[Chat] Failed to save history:", historyErr);
                }

                send(res, 200, { response: aiResponse });
                return true;
            } catch (e) {
                console.error("[Chat] Request Failed:", e);
                return send(res, 500, { error: 'Internal chat error' });
            }
        }
    }

    return false;
}

module.exports = { chatRoutes };
