const { query } = require('../config/db');
const fetch = require('node-fetch');

const WEATHER_TIMEOUT_MS = 8000; // 8 seconds

// --- Weather Helper ---
async function fetchWeather(lat, lon) {
    // Round to 2 decimal places to group cache entries (approx 1.1km precision)
    const rLat = Math.round(lat * 100) / 100;
    const rLon = Math.round(lon * 100) / 100;

    try {
        // 1. Check cache (valid for 1 hour — weather changes fast)
        try {
            const cacheRes = await query(
                `SELECT data FROM weather_cache 
       WHERE lat=$1 AND lon=$2 
       AND updated_at > NOW() - INTERVAL '1 hour'`,
                [rLat, rLon]
            );

            if (cacheRes.rows.length > 0) {
                return cacheRes.rows[0].data;
            }
        } catch (cacheErr) {
            // Cache table might not exist — continue without cache
            console.warn('[Weather] Cache read failed (table may not exist):', cacheErr.message);
        }

        // 2. Fetch live data from Open-Meteo APIs
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${rLat}&longitude=${rLon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&temperature_unit=fahrenheit&timezone=auto`;
        const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${rLat}&longitude=${rLon}&current=us_aqi&timezone=auto`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), WEATHER_TIMEOUT_MS);

        const [wRes, aRes] = await Promise.all([
            fetch(weatherUrl, { signal: controller.signal }).then(async r => {
                if (!r.ok) {
                    const text = await r.text();
                    throw new Error(`Weather API ${r.status}: ${text}`);
                }
                return r.json();
            }),
            fetch(aqiUrl, { signal: controller.signal }).then(async r => {
                if (!r.ok) {
                    // AQI is non-critical — return fallback
                    console.warn(`[Weather] AQI API returned ${r.status}, using fallback`);
                    return { current: { us_aqi: null } };
                }
                return r.json();
            }).catch(aqiErr => {
                // AQI fetch failed — return fallback so weather still works
                console.warn('[Weather] AQI fetch failed:', aqiErr.message);
                return { current: { us_aqi: null } };
            })
        ]);
        clearTimeout(timeout);

        // Validate that we got meaningful weather data
        if (wRes.current?.temperature_2m === undefined || wRes.current?.weather_code === undefined) {
            console.error('[Weather] API returned incomplete data:', JSON.stringify(wRes.current));
            return null;
        }

        const data = {
            temp: wRes.current.temperature_2m,
            condition_code: wRes.current.weather_code,
            aqi: aRes.current?.us_aqi ?? 0,
            params: {
                temp_unit: wRes.current_units?.temperature_2m || '°F',
                aqi_unit: 'US AQI'
            },
            forecast: (wRes.daily?.time || []).map((t, i) => ({
                date: t,
                max_temp: wRes.daily.temperature_2m_max[i],
                min_temp: wRes.daily.temperature_2m_min[i],
                rain_prob: wRes.daily.precipitation_probability_max?.[i] || 0,
                code: wRes.daily.weather_code[i]
            }))
        };

        // 3. Update Cache — non-blocking, don't let cache failure lose the data
        try {
            await query(
                `INSERT INTO weather_cache (lat, lon, data, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (lat, lon) 
       DO UPDATE SET data = $3, updated_at = NOW()`,
                [rLat, rLon, data]
            );
        } catch (cacheWriteErr) {
            console.warn('[Weather] Cache write failed:', cacheWriteErr.message);
            // Still return the data — cache is optional
        }

        return data;
    } catch (e) {
        if (e.name === 'AbortError') {
            console.error('[Weather] Fetch timed out after', WEATHER_TIMEOUT_MS, 'ms');
        } else {
            console.error('[Weather] Fetch Failed:', e.message || e);
        }
        return null; // Return null on failure so UI handles it gracefully
    }
}

module.exports = { fetchWeather };
