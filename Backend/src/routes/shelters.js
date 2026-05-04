const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');
const { validateCoords, validatePositiveInt } = require('../utils/validate');

async function shelterRoutes(req, res, requireAuth) {
  // -------- SHELTERS LIST
  {
    const m = match(req.method, req.url, { method: 'GET', path: '/shelters' });
    if (m) {
      await requireAuth();
      const lat = Number(m.search.get('lat'));
      const lon = Number(m.search.get('lon'));
      const radiusKm = validatePositiveInt(m.search.get('radius_km'), { min: 1, max: 500, defaultVal: 300 });
      const limit = validatePositiveInt(m.search.get('limit'), { min: 1, max: 500, defaultVal: 100 });

      const coords = validateCoords(lat, lon);
      if (!coords) return send(res, 400, { error: 'Valid lat and lon required' });

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
            WHERE s.lat BETWEEN $1 - ($3 / 111.0) AND $1 + ($3 / 111.0)
              AND s.lon BETWEEN $2 - ($3 / (111.0 * COS(RADIANS($1)))) AND $2 + ($3 / (111.0 * COS(RADIANS($1))))
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
