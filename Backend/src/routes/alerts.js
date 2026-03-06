const { parseJson } = require('../utils/json');
const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');

async function alertRoutes(req, res, requireAuth) {
    // -------- ALERTS LIST
    {
        const m = match(req.method, req.url, { method: 'GET', path: '/alerts' });
        if (m) {
            requireAuth();
            const lat = Number(m.search.get('lat'));
            const lon = Number(m.search.get('lon'));
            const radiusKm = Number(m.search.get('radius_km') || 500);

            let sql = `
            SELECT a.*, h.lat as hazard_lat, h.lon as hazard_lon, h.type as hazard_type, 
                   h.severity as hazard_severity, h.attributes->>'title' as hazard_title
            FROM alert a
            JOIN hazard h ON a.hazard_id = h.id
            WHERE h.occurred_at >= NOW() - INTERVAL '48 hours'
        `;
            const params = [];
            let paramIdx = 1;

            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                sql += `
                AND (
                    h.lat IS NULL OR 
                    (6371 * acos(
                        cos(radians($${paramIdx})) * cos(radians(h.lat)) * cos(radians(h.lon) - radians($${paramIdx + 1})) + 
                        sin(radians($${paramIdx})) * sin(radians(h.lat))
                    )) <= $${paramIdx + 2}
                )
              `;
                params.push(lat, lon, radiusKm);
                paramIdx += 3;
            }

            // Optional severity filter (0-1 float)
            const minSev = Number(m.search.get('min_severity'));
            if (!Number.isNaN(minSev) && minSev > 0) {
                sql += ` AND h.severity >= $${paramIdx}`;
                params.push(minSev);
                paramIdx++;
            }

            sql += ` ORDER BY a.created_at DESC LIMIT 200`;
            const r = await query(sql, params);
            send(res, 200, r.rows);
            return true;
        }
    }

    return false;
}

module.exports = { alertRoutes };
