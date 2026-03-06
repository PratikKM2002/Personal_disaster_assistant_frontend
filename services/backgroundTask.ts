import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
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

/**
 * Start background location tracking.
 * Call this after user grants "always" location permission.
 */
export async function startBackgroundLocation() {
    const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_BATTERY_TASK).catch(() => false);
    if (isStarted) return;

    await Location.startLocationUpdatesAsync(LOCATION_BATTERY_TASK, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60000, // Every 60 seconds
        distanceInterval: 100, // Or every 100 meters
        deferredUpdatesInterval: 60000,
        showsBackgroundLocationIndicator: true, // iOS: blue bar
        foregroundService: Platform.OS === 'android' ? {
            notificationTitle: 'Guardian AI',
            notificationBody: 'Monitoring your location for safety',
            notificationColor: '#3b82f6',
        } : undefined,
        // iOS-specific: helps system optimize power usage
        activityType: Location.ActivityType.OtherNavigation,
        pausesUpdatesAutomatically: false,
    });

    console.log('[Background] Location tracking started.');
}

