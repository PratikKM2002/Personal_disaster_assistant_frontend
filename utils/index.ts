// Utility functions for Guardian AI
import { Linking, Platform } from 'react-native';

/**
 * Open Google Maps for turn-by-turn navigation
 * Falls back to Apple Maps on iOS or browser on web
 */
export const openGoogleMapsNavigation = async (
    destination: { lat: number; lng: number; name?: string },
    origin?: { lat: number; lng: number }
) => {
    const { lat, lng, name } = destination;

    // Try Google Maps first
    const googleMapsUrl = origin
        ? `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${lat},${lng}&travelmode=driving`
        : `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    // Deep link for Google Maps app
    const googleMapsAppUrl = Platform.select({
        ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
        android: `google.navigation:q=${lat},${lng}`,
        default: googleMapsUrl,
    });

    try {
        // Try to open in Google Maps app first
        const canOpenGoogleMaps = await Linking.canOpenURL(googleMapsAppUrl);
        if (canOpenGoogleMaps) {
            await Linking.openURL(googleMapsAppUrl);
            return;
        }

        // Fall back to browser/web maps
        await Linking.openURL(googleMapsUrl);
    } catch (error) {
        console.error('Error opening maps:', error);
        // Ultimate fallback - try Apple Maps on iOS
        if (Platform.OS === 'ios') {
            const appleMapsUrl = `http://maps.apple.com/?daddr=${lat},${lng}`;
            await Linking.openURL(appleMapsUrl);
        }
    }
};

/**
 * Make a phone call
 */
export const makePhoneCall = (phoneNumber: string) => {
    const number = phoneNumber.replace(/[^\d+]/g, '');
    Linking.openURL(`tel:${number}`);
};

/**
 * Send SMS
 */
export const sendSMS = (phoneNumber: string, body?: string) => {
    const number = phoneNumber.replace(/[^\d+]/g, '');
    const url = body ? `sms:${number}?body=${encodeURIComponent(body)}` : `sms:${number}`;
    Linking.openURL(url);
};

/**
 * Format time ago string
 */
export const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
};

/**
 * Format time (HH:MM AM/PM)
 */
export const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

/**
 * Get severity color
 */
export const getSeverityColor = (severity: 'critical' | 'high' | 'moderate' | 'low' | string) => {
    switch (severity) {
        case 'critical':
            return { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#fca5a5' };
        case 'high':
            return { bg: 'rgba(249, 115, 22, 0.2)', border: '#f97316', text: '#fdba74' };
        case 'moderate':
            return { bg: 'rgba(234, 179, 8, 0.2)', border: '#eab308', text: '#fde047' };
        case 'low':
        default:
            return { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#86efac' };
    }
};

/**
 * Get status color for family/neighbors
 */
export const getStatusColor = (status: 'safe' | 'danger' | 'pending' | 'unknown' | 'needs-help' | 'offering-help' | string) => {
    switch (status) {
        case 'safe':
            return { bg: 'rgba(34, 197, 94, 0.2)', border: '#22c55e', text: '#86efac', marker: '#22c55e' };
        case 'danger':
        case 'needs-help':
            return { bg: 'rgba(239, 68, 68, 0.2)', border: '#ef4444', text: '#fca5a5', marker: '#ef4444' };
        case 'pending':
            return { bg: 'rgba(234, 179, 8, 0.2)', border: '#eab308', text: '#fde047', marker: '#eab308' };
        case 'offering-help':
            return { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', text: '#93c5fd', marker: '#3b82f6' };
        case 'unknown':
        default:
            return { bg: 'rgba(107, 114, 128, 0.2)', border: '#6b7280', text: '#9ca3af', marker: '#6b7280' };
    }
};
