const { send } = require('../utils/send');
const { match } = require('../utils/url');
const { query } = require('../config/db');
const { fetchWeather } = require('../services/weather');
const { fetchFloodRisk } = require('../services/flood');
const { getSafeRoute } = require('../services/route-service');

async function hazardRoutes(req, res, requireAuth) {
  // -------- OVERVIEW: hazards + adaptive shelters
  {
    const m = match(req.method, req.url, { method: 'GET', path: '/overview' });
    if (m) {
      const auth = requireAuth();
      const lat = Number(m.search.get('lat'));
      const lon = Number(m.search.get('lon'));
      const radiusKm = Number(m.search.get('radius_km') || 100);
      const city = (m.search.get('city') || '').trim();
      const limit = Number(m.search.get('limit') || 5);

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return send(res, 400, { error: 'lat and lon (numbers) are required' });
      }

      const weatherData = await fetchWeather(lat, lon);

      const hazardSql = `
          WITH params AS (
            SELECT radians($1)::float8 AS lat1,
                   radians($2)::float8 AS lon1,
                   $3::float8 AS radius_km
          ),
          calc AS (
            SELECT
              h.id, h.type, h.severity, h.occurred_at, h.lat, h.lon,
              h.source, h.source_event_id, h.attributes,
              (
                2 * 6371 * ASIN(
                  SQRT(
                    POWER(SIN((RADIANS(h.lat) - (SELECT lat1 FROM params)) / 2), 2) +
                    COS((SELECT lat1 FROM params)) * COS(RADIANS(h.lat)) *
                    POWER(SIN((RADIANS(h.lon) - (SELECT lon1 FROM params)) / 2), 2)
                  )
                )
              ) AS dist_km
            FROM hazard h
          )
          SELECT * FROM calc
          WHERE dist_km <= (SELECT radius_km FROM params)
          ORDER BY dist_km ASC, occurred_at DESC
          LIMIT 50;
        `;

      const sheltersSql = `
          WITH params AS (
            SELECT radians($1)::float8 AS lat1,
                   radians($2)::float8 AS lon1
          )
          SELECT
            s.id, s.name, s.address, s.lat, s.lon, s.capacity, s.status, s.phone, s.updated_at, s.type,
            (
              2 * 6371 * ASIN(
                SQRT(
                  POWER(SIN((RADIANS(s.lat) - (SELECT lat1 FROM params)) / 2), 2) +
                  COS((SELECT lat1 FROM params)) * COS(RADIANS(s.lat)) *
                  POWER(SIN((RADIANS(s.lon) - (SELECT lon1 FROM params)) / 2), 2)
                )
              )
            ) AS dist_km
          FROM shelter s
        `;

      const hazardsRes = await query(hazardSql, [lat, lon, radiusKm]);
      const hazards = hazardsRes.rows;

      const tryRadii = [];
      if (Number.isFinite(radiusKm) && radiusKm > 0) tryRadii.push(radiusKm);
      for (const r of [100, 300, 1000]) if (!tryRadii.includes(r)) tryRadii.push(r);

      let shelters = [];
      let strategy = null;

      for (const r of tryRadii) {
        const sql = `
            WITH src AS (${sheltersSql})
            SELECT * FROM src
            WHERE dist_km <= $3
            ORDER BY dist_km ASC, capacity DESC NULLS LAST
            LIMIT $4;
          `;
        const rRes = await query(sql, [lat, lon, r, limit]);
        if (rRes.rowCount > 0) {
          shelters = rRes.rows;
          strategy = `radius_${r}km`;
          break;
        }
      }

      if (shelters.length === 0 && city) {
        const cityRes = await query(
          `
            SELECT
              s.id, s.name, s.address, s.lat, s.lon, s.capacity, s.status, s.phone, s.updated_at,
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
            WHERE s.address ILIKE $3
            ORDER BY dist_km ASC, capacity DESC NULLS LAST
            LIMIT $4;
            `,
          [lat, lon, `%${city}%`, limit]
        );
        if (cityRes.rowCount > 0) {
          shelters = cityRes.rows;
          strategy = `city_match_${city}`;
        }
      }

      const [neighborRes, resourceRes, familyRes, profileRes] = await Promise.all([
        query(`
             SELECT COUNT(*) as count FROM user_neighbor un 
             JOIN user_account u ON un.neighbor_id = u.id 
             WHERE un.user_id = $1 AND u.safety_status = 'safe'
           `, [auth.uid]),
        query(`SELECT COUNT(*) as count FROM community_resource WHERE status = 'active'`),
        query(`
             SELECT 
               COUNT(*) FILTER (WHERE safety_status = 'safe') as safe_count,
               COUNT(*) as total_count
             FROM user_account
             WHERE family_id = (SELECT family_id FROM user_account WHERE id = $1)
               AND family_id IS NOT NULL
           `, [auth.uid]),
        query(`SELECT * FROM user_account WHERE id = $1`, [auth.uid])
      ]);

      const neighborsSafe = parseInt(neighborRes.rows[0].count);
      const resourcesNearby = parseInt(resourceRes.rows[0].count);
      const familySafe = parseInt(familyRes.rows[0]?.safe_count || 0);
      const familyTotal = parseInt(familyRes.rows[0]?.total_count || 0);

      let prepScore = 0;
      const user = profileRes.rows[0];
      if (user.home_lat) prepScore += 2;
      if (user.phone) prepScore += 2;
      if (familyTotal > 0) prepScore += 3;
      const allNeighborsRes = await query('SELECT COUNT(*) FROM user_neighbor WHERE user_id=$1', [auth.uid]);
      if (parseInt(allNeighborsRes.rows[0].count) > 0) prepScore += 3;

      const stats = {
        neighbors_safe: neighborsSafe,
        resources_nearby: resourcesNearby,
        family_safe: familySafe,
        family_total: familyTotal,
        preparedness_score: Math.min(10, prepScore)
      };

      send(res, 200, {
        location: { lat, lon, radius_km: radiusKm, city: city || null },
        hazards,
        shelters: { items: shelters, strategy },
        stats,
        weather: weatherData
      });
      return true;
    }
  }

  // -------- HAZARDS LIST
  {
    const m = match(req.method, req.url, { method: 'GET', path: '/hazards' });
    if (m) {
      const lat = Number(m.search.get('lat'));
      const lon = Number(m.search.get('lon'));
      const type = m.search.get('type') || 'earthquake';
      const radiusKm = Number(m.search.get('radius_km') || 50);
      const since = m.search.get('since');

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return send(res, 400, { error: 'lat and lon (numbers) are required' });
      }

      const sql = `
          WITH params AS (
            SELECT radians($1)::float8 AS lat1,
                   radians($2)::float8 AS lon1,
                   $3::float8 AS radius_km
          ),
          calc AS (
            SELECT
              h.id, h.type, h.severity, h.occurred_at, h.lat, h.lon,
              h.source, h.source_event_id, h.attributes,
              (
                2 * 6371 * ASIN(
                  SQRT(
                    POWER(SIN((RADIANS(h.lat) - (SELECT lat1 FROM params)) / 2), 2) +
                    COS((SELECT lat1 FROM params)) * COS(RADIANS(h.lat)) *
                    POWER(SIN((RADIANS(h.lon) - (SELECT lon1 FROM params)) / 2), 2)
                  )
                )
              ) AS dist_km
            FROM hazard h
            WHERE h.type = $4
            ${since ? `AND h.occurred_at >= $5` : ``}
          )
          SELECT *
          FROM calc
          WHERE dist_km <= (SELECT radius_km FROM params)
          ORDER BY occurred_at DESC
          LIMIT 200;
        `;
      const params = since ? [lat, lon, radiusKm, type, since] : [lat, lon, radiusKm, type];
      const r = await query(sql, params);
      send(res, 200, r.rows);
      return true;
    }
  }

  // -------- HAZARDS: FLOOD
  {
    const m = match(req.method, req.url, { method: 'GET', path: '/hazards/flood' });
    if (m) {
      const lat = Number(m.search.get('lat'));
      const lon = Number(m.search.get('lon'));
      if (Number.isNaN(lat) || Number.isNaN(lon)) return send(res, 400, { error: 'lat and lon required' });
      const data = await fetchFloodRisk(lat, lon);
      if (!data) return send(res, 502, { error: 'Failed to fetch flood data' });
      send(res, 200, data);
      return true;
    }
  }

  // -------- NAVIGATION: Route pathfinding
  {
    const m = match(req.method, req.url, { method: 'GET', path: '/route' });
    if (m) {
      const startLat = Number(m.search.get('startLat'));
      const startLon = Number(m.search.get('startLon'));
      const endLat = Number(m.search.get('endLat'));
      const endLon = Number(m.search.get('endLon'));
      const mode = m.search.get('mode') || 'driving';

      if ([startLat, startLon, endLat, endLon].some(Number.isNaN)) {
        return send(res, 400, { error: 'startLat, startLon, endLat, endLon (numbers) are required' });
      }

      try {
        const routeData = await getSafeRoute(startLat, startLon, endLat, endLon, mode);
        send(res, 200, routeData);
      } catch (err) {
        console.error('[Route Error]', err);
        send(res, 500, { error: err.message || 'Routing failed' });
      }
      return true;
    }
  }

  return false;
}

module.exports = { hazardRoutes };
