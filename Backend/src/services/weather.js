const { query } = require('../config/db');
const fetch = require('node-fetch');

// --- Weather Helper ---
async function fetchWeather(lat, lon) {
    // Round to 2 decimal places to group cache entries (approx 1.1km precision)
    const rLat = Math.round(lat * 100) / 100;
    const rLon = Math.round(lon * 100) / 100;

    try {
        // 1. Check cache (valid for 24 hours)
        const cacheRes = await query(
            `SELECT data FROM weather_cache 
       WHERE lat=$1 AND lon=$2 
       AND updated_at > NOW() - INTERVAL '24 hours'`,
            [rLat, rLon]
        );

        if (cacheRes.rows.length > 0) {
            return cacheRes.rows[0].data;
        }

        // 2. Fetch from APIs
        // Weather: Temp, Code, Daily High/Low, Rain Risk
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${rLat}&longitude=${rLon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto`;
        // AQI: US AQI
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${rLat}&longitude=${rLon}&current=us_aqi&timezone=auto`;

        const [wRes, aRes] = await Promise.all([
            fetch(weatherUrl).then(async r => {
                if (!r.ok) {
                    const text = await r.text();
                    throw new Error(`Weather API ${r.status}: ${text}`);
                }
                return r.json();
            }),
            fetch(aqiUrl).then(async r => {
                if (!r.ok) {
                    const text = await r.text();
                    throw new Error(`AQI API ${r.status}: ${text}`);
                }
                return r.json();
            })
        ]);

        const data = {
            temp: wRes.current?.temperature_2m,
            condition_code: wRes.current?.weather_code,
            aqi: aRes.current?.us_aqi,
            params: { // Store units
                temp_unit: wRes.current_units?.temperature_2m,
                aqi_unit: 'US AQI'
            },
            forecast: wRes.daily?.time.map((t, i) => ({
                date: t,
                max_temp: wRes.daily.temperature_2m_max[i],
                min_temp: wRes.daily.temperature_2m_min[i],
                rain_prob: wRes.daily.precipitation_probability_max?.[i] || 0,
                code: wRes.daily.weather_code[i]
            })) || []
        };

        // 3. Update Cache (Upsert)
        await query(
            `INSERT INTO weather_cache (lat, lon, data, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (lat, lon) 
       DO UPDATE SET data = $3, updated_at = NOW()`,
            [rLat, rLon, data]
        );

        return data;
    } catch (e) {
        console.error('[Weather] Fetch Failed:', e);
        return null; // Return null on failure so UI handles it gracefully
    }
}

module.exports = { fetchWeather };
