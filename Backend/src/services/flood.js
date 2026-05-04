const fetch = require('node-fetch');
const { query } = require('../config/db');

const FLOOD_TIMEOUT_MS = 8000; // 8 seconds

// --- Flood Data Helper ---
// Uses Open-Meteo Flood API (Copernicus GloFAS data)
async function fetchFloodRisk(lat, lon) {
    // Round to 2 decimal places for better cache hit rates with the API
    const rLat = Math.round(lat * 100) / 100;
    const rLon = Math.round(lon * 100) / 100;

    const url = `https://flood-api.open-meteo.com/v1/flood?latitude=${rLat}&longitude=${rLon}&daily=river_discharge,river_discharge_mean,river_discharge_median,river_discharge_max&forecast_days=3`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), FLOOD_TIMEOUT_MS);
        let res;
        try {
            res = await fetch(url, { signal: controller.signal });
        } catch (err) {
            clearTimeout(timeout);
            if (err.name === 'AbortError') throw new Error('Flood API request timed out');
            throw err;
        }
        clearTimeout(timeout);
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
        // If today's risk is High, save/update as a hazard event
        const today = forecast[0];
        const source_event_id = `GLOFAS_${rLat}_${rLon}_${today?.date}`;

        if (today && today.risk_level === 'high') {
            // Upsert — update severity/attributes if conditions change
            const dischargeRatio = today.river_discharge / (today.river_discharge_median > 0.1 ? today.river_discharge_median : 0.1);
            const hazardRes = await query(`
                INSERT INTO hazard (type, severity, occurred_at, lat, lon, source, source_event_id, attributes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (source, source_event_id) DO UPDATE
                SET severity = EXCLUDED.severity,
                    attributes = EXCLUDED.attributes,
                    occurred_at = EXCLUDED.occurred_at
                RETURNING id
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
                    ratio: dischargeRatio.toFixed(2),
                    title: `Flood Risk: ${today.risk_level.toUpperCase()}`,
                    description: dischargeRatio > 5
                        ? "Critical river discharge levels. Excessive rainfall may cause severe urban and river flooding."
                        : "Elevated river discharge levels. Be cautious of ponding in low-lying areas and poor drainage."
                })
            ]);

            const hazardId = hazardRes.rows[0].id;
            await query(`
                INSERT INTO flood_event(hazard_id, river_discharge, discharge_median, discharge_ratio, risk_level)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (hazard_id) DO UPDATE SET
                  river_discharge = EXCLUDED.river_discharge,
                  discharge_median = EXCLUDED.discharge_median,
                  discharge_ratio = EXCLUDED.discharge_ratio,
                  risk_level = EXCLUDED.risk_level
            `, [hazardId, today.river_discharge, today.river_discharge_median, dischargeRatio, today.risk_level]);
        } else if (today) {
            // Risk has dropped — remove any existing hazard for this location/date
            await query(`
                DELETE FROM hazard 
                WHERE source = 'Copernicus GloFAS' 
                  AND source_event_id = $1
            `, [source_event_id]);
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
