const fetch = require('node-fetch');
const { pool } = require('../config/db');

// Map frontend mode names to OSRM profile names
const OSRM_PROFILES = {
    driving: 'driving',
    walking: 'foot',
    cycling: 'bike',
    foot: 'foot',
    bike: 'bike',
};

// Hazard danger radii in km by severity (used for avoidance scoring)
const HAZARD_RADIUS_KM = {
    critical: 8,
    high: 5,
    moderate: 3,
    low: 2,
};

// Average speeds in km/h for duration estimation
// (OSRM public server only serves driving profile, so we recalculate for other modes)
const MODE_SPEEDS_KMH = {
    driving: null,    // use OSRM's actual driving estimate
    walking: 5,
    cycling: 15,
};

async function getSafeRoute(startLat, startLon, endLat, endLon, mode = 'driving') {
    // Always use 'driving' profile on OSRM public (only one available)
    // but recalculate duration for walking/cycling based on realistic speeds
    const profile = 'driving';

    // 1. Request up to 3 alternative routes from OSRM
    const url = `https://router.project-osrm.org/route/v1/${profile}/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=true&alternatives=3`;

    console.log(`[Router] Fetching OSRM (mode=${mode}): ${url}`);
    const res = await fetch(url);
    const data = await res.json();

    if (data.code !== 'Ok') {
        throw new Error(data.message || 'Routing failed');
    }

    const routes = data.routes; // up to 3 alternatives

    // 2. Fetch hazards near the overall corridor (union of all route bboxes)
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    for (const route of routes) {
        for (const [lon, lat] of route.geometry.coordinates) {
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
            if (lon < minLon) minLon = lon;
            if (lon > maxLon) maxLon = lon;
        }
    }

    // Buffer bbox by ~50km (approx 0.5 deg)
    minLat -= 0.5; maxLat += 0.5;
    minLon -= 0.5; maxLon += 0.5;

    const hazardRes = await pool.query(`
        SELECT id, type, severity, lat, lon, attributes 
        FROM hazard 
        WHERE lat BETWEEN $1 AND $2 AND lon BETWEEN $3 AND $4
        AND occurred_at > NOW() - INTERVAL '3 days'
    `, [minLat, maxLat, minLon, maxLon]);

    const hazards = hazardRes.rows;

    // 3. Score each route for hazard proximity
    const scoredRoutes = routes.map((route, idx) => {
        const coords = route.geometry.coordinates;
        const warnings = [];

        for (const hazard of hazards) {
            const dangerRadius = HAZARD_RADIUS_KM[hazard.severity] || 5;
            let isDangerous = false;
            let closestDist = Infinity;

            // Sample every 5th point for performance
            for (let i = 0; i < coords.length; i += 5) {
                const [rLon, rLat] = coords[i];
                const dist = getDistanceFromLatLonInKm(hazard.lat, hazard.lon, rLat, rLon);
                if (dist < closestDist) closestDist = dist;
                if (dist < dangerRadius) {
                    isDangerous = true;
                    break;
                }
            }

            if (isDangerous) {
                warnings.push({
                    type: 'hazard_proximity',
                    message: `Route passes near a ${hazard.severity} ${hazard.type}`,
                    hazard: hazard,
                    closestDistKm: Math.round(closestDist * 10) / 10,
                });
            }
        }

        // Score: fewer warnings = better, weighted by severity
        let dangerScore = 0;
        for (const w of warnings) {
            const sev = w.hazard.severity;
            dangerScore += sev === 'critical' ? 10 : sev === 'high' ? 5 : sev === 'moderate' ? 2 : 1;
        }

        return {
            route,
            warnings,
            dangerScore,
            index: idx,
        };
    });

    // 4. Pick the safest route (lowest danger score; tie-break by shortest distance)
    scoredRoutes.sort((a, b) => {
        if (a.dangerScore !== b.dangerScore) return a.dangerScore - b.dangerScore;
        return a.route.distance - b.route.distance;
    });

    const best = scoredRoutes[0];
    const chosen = best.route;

    console.log(`[Router] ${routes.length} alternatives, chose #${best.index + 1} (danger=${best.dangerScore}, warnings=${best.warnings.length})`);

    // 5. Recalculate duration for non-driving modes
    const speedKmh = MODE_SPEEDS_KMH[mode];
    let adjustedDuration = chosen.duration;
    let adjustedLegs = chosen.legs;

    if (speedKmh) {
        // Recalculate total duration from distance and speed
        const distKm = chosen.distance / 1000;
        adjustedDuration = (distKm / speedKmh) * 3600; // seconds

        // Recalculate each step's duration proportionally
        adjustedLegs = chosen.legs.map(leg => ({
            ...leg,
            duration: (leg.distance / 1000 / speedKmh) * 3600,
            steps: leg.steps.map(step => ({
                ...step,
                duration: (step.distance / 1000 / speedKmh) * 3600,
            })),
        }));
    }

    return {
        ...chosen,
        duration: adjustedDuration,
        legs: adjustedLegs,
        travelMode: mode,
        warnings: best.warnings,
        isSafe: best.warnings.length === 0,
        alternativesConsidered: routes.length,
        avoidedHazards: scoredRoutes.length > 1 && best.dangerScore < scoredRoutes[scoredRoutes.length - 1].dangerScore,
    };
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180);
}

module.exports = { getSafeRoute };
