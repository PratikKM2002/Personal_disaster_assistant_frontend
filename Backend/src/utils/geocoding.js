const fetch = require('node-fetch');

const GEOCODE_TIMEOUT_MS = 5000; // 5 seconds

/**
 * Reverse geocodes lat/lon into a readable address using OSM Nominatim.
 */
async function reverseGeocode(lat, lon) {
    if (lat == null || lon == null) return null;

    // Round to 4 decimal places for privacy and to group nearby requests
    const rLat = Math.round(lat * 10000) / 10000;
    const rLon = Math.round(lon * 10000) / 10000;

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${rLat}&lon=${rLon}&format=json&addressdetails=1`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
        let res;
        try {
            res = await fetch(url, {
                headers: {
                    'User-Agent': 'GuardianAI-PDA/1.0',
                    'Accept-Language': 'en'
                },
                signal: controller.signal
            });
        } catch (err) {
            clearTimeout(timeout);
            if (err.name === 'AbortError') {
                console.error('[Geocoding] Reverse geocode timed out');
                return null;
            }
            throw err;
        }
        clearTimeout(timeout);

        if (!res.ok) return null;

        const data = await res.json();
        if (!data || !data.display_name) return null;

        // Simplify address - we usually just want the street/neighborhood/city
        const addr = data.address || {};
        const components = [];

        if (addr.road) components.push(addr.road);
        if (addr.neighbourhood || addr.suburb) components.push(addr.neighbourhood || addr.suburb);
        if (addr.city || addr.town || addr.village) components.push(addr.city || addr.town || addr.village);

        if (components.length > 0) {
            return components.join(', ');
        }

        // Fallback to display_name (truncated)
        return data.display_name.split(',').slice(0, 3).join(',').trim();
    } catch (err) {
        console.error('[Geocoding] Reverse Failed:', err.message);
        return null;
    }
}

module.exports = { reverseGeocode };
