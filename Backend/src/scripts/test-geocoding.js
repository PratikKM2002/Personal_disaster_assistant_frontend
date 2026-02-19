const { reverseGeocode } = require('../utils/geocoding');

async function test() {
    const lat = 40.7128; // New York
    const lon = -74.0060;
    console.log(`Testing reverse geocode for ${lat}, ${lon}...`);
    const address = await reverseGeocode(lat, lon);
    console.log(`Resolved address: ${address}`);
    if (address) {
        console.log('SUCCESS: Geocoding works!');
    } else {
        console.error('FAILED: No address resolved.');
        process.exit(1);
    }
}

test().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
});
