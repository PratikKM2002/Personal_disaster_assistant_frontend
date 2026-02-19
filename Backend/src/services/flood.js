const fetch = require('node-fetch');
const { query } = require('../config/db');

// --- Flood Data Helper ---
// Uses Open-Meteo Flood API (Copernicus GloFAS data)
async function fetchFloodRisk(lat, lon) {
    // Round to 2 decimal places for better cache hit rates with the API
    const rLat = Math.round(lat * 100) / 100;
    const rLon = Math.round(lon * 100) / 100;

    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${rLat}&longitude=${rLon}&daily=river_discharge,river_discharge_mean,river_discharge_median,river_discharge_max&forecast_days=3`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Flood API ${res.status}: ${text}`);
        }
        const data = await res.json();

        // Process data to determine risk
        // We compare current discharge against the historical "mean" or "median"
        // If discharge > 1.5 * median => Elevated Risk
        // If discharge > 2.0 * median => High Risk (Simplified logic)

        const daily = data.daily || {};
        const dates = daily.time || [];

        const forecast = dates.map((date, i) => {
            const discharge = daily.river_discharge[i]; // m³/s
            const median = daily.river_discharge_median[i];
            const max = daily.river_discharge_max[i]; // historical max

            let risk_level = 'low';
            let risk_score = 0; // 0-1

            // Avoid division by zero
            const baseline = median > 0.1 ? median : 0.1;
            const ratio = discharge / baseline;

            if (ratio > 5.0) {
                risk_level = 'high';
                risk_score = 0.8;
            } else if (ratio > 2.5) {
                risk_level = 'moderate';
                risk_score = 0.5;
            }

            return {
                date,
                river_discharge: discharge,
                river_discharge_median: median,
                risk_level,
                risk_score
            };
        });

        // --- Persistence Logic ---
        // If today's risk is High, we save it as a hazard event
        const today = forecast[0];
        if (today && today.risk_level === 'high') {
            const source_event_id = `GLOFAS_${rLat}_${rLon}_${today.date}`;

            // Insert into hazard table
            await query(`
                INSERT INTO hazard (type, severity, occurred_at, lat, lon, source, source_event_id, attributes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (source, source_event_id) DO NOTHING
            `, [
                'flood',
                today.risk_score,
                new Date(today.date),
                rLat,
                rLon,
                'Copernicus GloFAS',
                source_event_id,
                JSON.stringify({
                    discharge: today.river_discharge,
                    median: today.river_discharge_median,
                    ratio: (today.river_discharge / today.river_discharge_median).toFixed(2),
                    title: `Flood Risk: ${today.risk_level.toUpperCase()}`,
                    description: today.river_discharge > today.river_discharge_median * 5
                        ? "Critical river discharge levels. Excessive rainfall may cause severe urban and river flooding."
                        : "Elevated river discharge levels. Be cautious of ponding in low-lying areas and poor drainage."
                })
            ]);
        }

        return {
            lat: rLat,
            lon: rLon,
            unit: data.daily_units?.river_discharge || 'm³/s',
            forecast
        };

    } catch (e) {
        console.error('[Flood] Fetch Failed:', e.message);
        return null;
    }
}

module.exports = { fetchFloodRisk };
