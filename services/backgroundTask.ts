import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { updateStatus } from './api';

export const LOCATION_BATTERY_TASK = 'LOCATION_BATTERY_TASK';

TaskManager.defineTask(LOCATION_BATTERY_TASK, async ({ data, error }) => {
    if (error) {
        console.error("Background task error:", error);
        return;
    }
    if (data) {
        const { locations } = data as { locations: Location.LocationObject[] };
        if (locations && locations.length > 0) {
            const location = locations[0];
            try {
                // Get Battery Level
                let batteryLevel = await Battery.getBatteryLevelAsync();

                // Convert 0.75 -> 75, handle -1 (unknown)
                let batteryPercent = batteryLevel !== -1 ? Math.round(batteryLevel * 100) : 0;

                console.log(`[Background] Loc: ${location.coords.latitude},${location.coords.longitude}, Bat: ${batteryPercent}%`);

                // Send to backend
                // Pass undefined for status to preserve existing status
                await updateStatus(
                    location.coords.latitude,
                    location.coords.longitude,
                    undefined, // Preserve safe/danger status
                    batteryPercent,
                    undefined // No message update
                );
            } catch (err) {
                console.error("Background update failed:", err);
            }
        }
    }
});
