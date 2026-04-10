/**
 * Input validation helpers to prevent injection and malformed data.
 */

/**
 * Validate lat/lon as finite numbers within valid geographic range.
 * @returns {{ lat: number, lon: number } | null} — parsed coords or null if invalid
 */
function validateCoords(lat, lon) {
  const nLat = Number(lat);
  const nLon = Number(lon);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLon)) return null;
  if (nLat < -90 || nLat > 90 || nLon < -180 || nLon > 180) return null;
  return { lat: nLat, lon: nLon };
}

/**
 * Validate and clamp a positive integer parameter.
 * @returns {number} — the clamped value, or defaultVal if invalid
 */
function validatePositiveInt(value, { min = 1, max = 1000, defaultVal = 100 } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min) return defaultVal;
  return Math.min(Math.floor(n), max);
}

module.exports = { validateCoords, validatePositiveInt };
