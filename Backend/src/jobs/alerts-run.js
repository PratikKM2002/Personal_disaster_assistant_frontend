const { query } = require('../config/db');

const LOOKBACK_MINUTES = Number(process.env.ALERT_LOOKBACK_MINUTES || 60);

/**
 * Radius rule (km) for hazard alerts:
 *  - Earthquakes: base 15 km, grows ~10 km per magnitude
 *  - Wildfires: 50 km default
 *  - Floods: 30 km (localized)
 *  - Tsunamis: 100 km (coastal reach)
 *  - Other: 50 km default
 */
function getRadiusSql() {
  return `CASE
    WHEN h.type = 'earthquake' THEN GREATEST(15, 10 * COALESCE((h.attributes->>'magnitude')::numeric, 3))
    WHEN h.type = 'flood' THEN 30
    WHEN h.type = 'tsunami' THEN 100
    ELSE 50
  END`;
}

/**
 * Build a rich, hazard-specific alert message by joining detail tables.
 */
function buildAlertMessage(c) {
  const distStr = `~${Math.round(c.dist_km)} km away`;

  switch (c.h_type) {
    case 'earthquake':
      if (c.magnitude) {
        return `🌍 Earthquake M${Number(c.magnitude).toFixed(1)} detected ${distStr}. ${c.eq_place ? `Near ${c.eq_place}.` : ''}`;
      }
      return `🌍 Earthquake detected ${distStr}.`;

    case 'wildfire':
      if (c.wf_acres) {
        const contained = c.wf_contained != null ? ` (${Number(c.wf_contained).toFixed(0)}% contained)` : '';
        return `🔥 Wildfire: ${c.h_title || 'Active fire'} — ${Number(c.wf_acres).toLocaleString()} acres${contained}, ${distStr}.`;
      }
      return `🔥 Wildfire alert: ${c.h_title || 'Active fire'} ${distStr}.`;

    case 'flood':
      if (c.fl_ratio) {
        const level = Number(c.fl_ratio) > 5 ? 'CRITICAL' : 'ELEVATED';
        return `🌊 Flood ${level}: River discharge at ${Number(c.fl_ratio).toFixed(1)}× median levels, ${distStr}.`;
      }
      return `🌊 Flood alert: ${c.h_title || 'Elevated discharge'} ${distStr}.`;

    case 'tsunami':
      if (c.ts_level) {
        return `🌊 Tsunami ${c.ts_level.toUpperCase()}: ${c.h_title || 'Coastal alert'} ${distStr}.`;
      }
      return `🌊 Tsunami alert: ${c.h_title || 'Coastal alert'} ${distStr}.`;

    default: {
      const typeLabel = c.h_type.charAt(0).toUpperCase() + c.h_type.slice(1);
      return `⚠️ ${typeLabel} alert: ${c.h_title || 'Emergency'} detected ${distStr}.`;
    }
  }
}


async function runAlerts() {
  // 1) Recent hazards (all types)
  const recentHazards = await query(
    `
    SELECT h.*
    FROM hazard h
    WHERE h.occurred_at >= NOW() - make_interval(mins => $1)
    ORDER BY h.occurred_at DESC
    `,
    [LOOKBACK_MINUTES]
  );

  let created = 0;

  for (const h of recentHazards.rows) {
    const radiusSql = getRadiusSql();

    // Compute the max possible radius for bounding-box pre-filter
    // Earthquakes can go up to ~100km, tsunamis up to 100km, others 50km
    const maxRadiusKm = 100;
    const bboxDeg = maxRadiusKm / 111.0; // rough degrees for pre-filter

    const candidates = await query(
      `
      WITH target AS (
        SELECT id, lat AS qlat, lon AS qlon, type,
               COALESCE((attributes->>'magnitude')::numeric, NULL) AS mag,
               attributes->>'title' AS title
        FROM hazard WHERE id = $1
      ),
      h AS (
        SELECT * FROM hazard WHERE id = $1
      ),
      places AS (
        SELECT
          up.user_id,
          (
            2 * 6371 * ASIN(
              SQRT(
                POWER(SIN((RADIANS(up.lat) - RADIANS(q.qlat)) / 2), 2) +
                COS(RADIANS(up.lat)) * COS(RADIANS(q.qlat)) *
                POWER(SIN((RADIANS(up.lon) - RADIANS(q.qlon)) / 2), 2)
              )
            )
          ) AS dist_km,
          (SELECT ${radiusSql} FROM h) AS radius_km,
          (SELECT mag FROM target) AS magnitude,
          (SELECT type FROM target) AS h_type,
          (SELECT title FROM target) AS h_title
        FROM user_place up CROSS JOIN target q
        WHERE up.lat BETWEEN q.qlat - ${bboxDeg} AND q.qlat + ${bboxDeg}
          AND up.lon BETWEEN q.qlon - ${bboxDeg} AND q.qlon + ${bboxDeg}
      ),
      live AS (
        SELECT
          ua.id AS user_id,
          (
            2 * 6371 * ASIN(
              SQRT(
                POWER(SIN((RADIANS(ua.last_lat) - RADIANS(q.qlat)) / 2), 2) +
                COS(RADIANS(ua.last_lat)) * COS(RADIANS(q.qlat)) *
                POWER(SIN((RADIANS(ua.last_lon) - RADIANS(q.qlon)) / 2), 2)
              )
            )
          ) AS dist_km,
          (SELECT ${radiusSql} FROM h) AS radius_km,
          (SELECT mag FROM target) AS magnitude,
          (SELECT type FROM target) AS h_type,
          (SELECT title FROM target) AS h_title
        FROM user_account ua CROSS JOIN target q
        WHERE ua.last_lat IS NOT NULL AND ua.last_lon IS NOT NULL
          AND ua.last_lat BETWEEN q.qlat - ${bboxDeg} AND q.qlat + ${bboxDeg}
          AND ua.last_lon BETWEEN q.qlon - ${bboxDeg} AND q.qlon + ${bboxDeg}
      ),
      combined AS (
        SELECT * FROM places
        UNION
        SELECT * FROM live
      )
      SELECT DISTINCT ON (user_id) c.user_id, c.dist_km, c.radius_km, c.magnitude, c.h_type, c.h_title,
             -- Join detail tables for rich messages
             eq.place AS eq_place,
             wf.acres AS wf_acres, wf.percent_contained AS wf_contained,
             fl.discharge_ratio AS fl_ratio,
             ts.warning_level AS ts_level
      FROM combined c
      LEFT JOIN earthquake_event eq ON c.h_type = 'earthquake' AND eq.hazard_id = $1
      LEFT JOIN wildfire_event wf ON c.h_type = 'wildfire' AND wf.hazard_id = $1
      LEFT JOIN flood_event fl ON c.h_type = 'flood' AND fl.hazard_id = $1
      LEFT JOIN tsunami_event ts ON c.h_type = 'tsunami' AND ts.hazard_id = $1
      WHERE c.dist_km <= c.radius_km
      `,
      [h.id]
    );

    if (candidates.rowCount === 0) continue;

    for (const c of candidates.rows) {
      const msg = buildAlertMessage(c);

      try {
        const result = await query(
          `
          INSERT INTO alert(user_id, hazard_id, message)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, hazard_id) DO NOTHING
          `,
          [c.user_id, h.id, msg]
        );
        if (result.rowCount > 0) created++;
      } catch (e) {
        console.error(`[Alerts] Failed to insert alert for user=${c.user_id} hazard=${h.id}:`, e.message || e);
      }
    }
  }

  console.log(`New alerts inserted: ${created}`);

  // 4) Cleanup old alerts (> 24 hours)
  try {
    const cleanup = await query(`DELETE FROM alert WHERE created_at < NOW() - INTERVAL '24 hours'`);
    if (cleanup.rowCount > 0) {
      console.log(`Cleaned up ${cleanup.rowCount} old alerts.`);
    }
  } catch (e) {
    console.error('Alert cleanup failed:', e.message);
  }
}

if (require.main === module) {
  runAlerts()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = { runAlerts };
