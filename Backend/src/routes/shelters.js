const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');

async function shelterRoutes(req, res, requireAuth) {
  // -------- SHELTERS LIST
  {
    const m = match(req.method, req.url, { method: 'GET', path: '/shelters' });
    if (m) {
      requireAuth();
      const lat = Number(m.search.get('lat'));
      const lon = Number(m.search.get('lon'));
      const radiusKm = Number(m.search.get('radius_km') || 300);
      const limit = Number(m.search.get('limit') || 100);

      if (Number.isNaN(lat) || Number.isNaN(lon)) return send(res, 400, { error: 'lat and lon required' });

      const sql = `
          WITH calc AS (
            SELECT
              s.*,
              (
                2 * 6371 * ASIN(
                  SQRT(
                    POWER(SIN((RADIANS(s.lat) - RADIANS($1)) / 2), 2) +
                    COS(RADIANS($1)) * COS(RADIANS(s.lat)) *
                    POWER(SIN((RADIANS(s.lon) - RADIANS($2)) / 2), 2)
                  )
                )
              ) AS dist_km
            FROM shelter s
          )
          SELECT * FROM calc
          WHERE dist_km <= $3
          ORDER BY dist_km ASC, capacity DESC
          LIMIT $4;
        `;
      const r = await query(sql, [lat, lon, radiusKm, limit]);
      send(res, 200, r.rows);
      return true;
    }
  }

  return false;
}

module.exports = { shelterRoutes };
