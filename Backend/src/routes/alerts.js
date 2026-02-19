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
            WHERE 1=1
        `;
            const params = [];
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
                sql += `
                AND (
                    h.lat IS NULL OR 
                    (6371 * acos(
                        cos(radians($1)) * cos(radians(h.lat)) * cos(radians(h.lon) - radians($2)) + 
                        sin(radians($1)) * sin(radians(h.lat))
                    )) <= $3
                )
              `;
                params.push(lat, lon, radiusKm);
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
