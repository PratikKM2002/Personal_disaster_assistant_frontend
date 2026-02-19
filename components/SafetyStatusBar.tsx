import { BorderRadius } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SafetyStatus = 'safe' | 'moderate' | 'caution' | 'danger';

interface SafetyStatusBarProps {
    hazards: any[];
    userLocation: { lat: number; lng: number };
    onPress?: () => void;
}

export default function SafetyStatusBar({ hazards, userLocation, onPress }: SafetyStatusBarProps) {
    // 1. Logic to find the nearest hazard and determine status
    const getSafetyStatus = () => {
        if (!hazards || hazards.length === 0) return { level: 'safe' as SafetyStatus, dist: null, hazard: null };

        const getDist = (h: any) => {
            const lat = h.location?.lat ?? h.lat;
            const lng = h.location?.lng ?? h.lon;
            if (lat === undefined || lng === undefined) return 1000;

            const phi1 = userLocation.lat * Math.PI / 180;
            const phi2 = lat * Math.PI / 180;
            const deltaPhi = (lat - userLocation.lat) * Math.PI / 180;
            const deltaLambda = (lng - userLocation.lng) * Math.PI / 180;

            const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
                Math.cos(phi1) * Math.cos(phi2) *
                Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return 6371 * c;
        };

        const nearest = hazards.reduce((prev, curr) => {
            return getDist(curr) < getDist(prev) ? curr : prev;
        });

        const distKm = getDist(nearest);
        if (distKm > 10) return { level: 'safe' as SafetyStatus, dist: distKm, hazard: nearest };

        const sev = nearest.severity?.toString().toLowerCase();
        let level: SafetyStatus = 'moderate';
        if (sev === 'critical' || sev === 'high' || sev === '3' || nearest.severity >= 0.7) level = 'danger';
        else if (sev === 'moderate' || sev === '2' || nearest.severity >= 0.4) level = 'caution';

        return { level, dist: distKm, hazard: nearest };
    };

    const status = getSafetyStatus();

    const getLabel = (level: SafetyStatus, hazard: any) => {
        if (level === 'safe') return 'Safe Zone';
        const type = hazard?.type ? hazard.type.charAt(0).toUpperCase() + hazard.type.slice(1) : 'Hazard';
        if (level === 'danger') return `DANGER: ${type.toUpperCase()}`;
        if (level === 'caution') return `High ${type} Caution`;
        return `Moderate ${type} Risk`;
    };

    const config: Record<SafetyStatus, { bg: string; border: string; icon: any; textColor: string }> = {
        safe: {
            bg: 'rgba(34, 197, 94, 0.15)',
            border: '#22c55e',
            icon: 'shield-checkmark',
            textColor: '#4ade80'
        },
        moderate: {
            bg: 'rgba(234, 179, 8, 0.15)',
            border: '#eab308',
            icon: 'information-circle',
            textColor: '#fde047'
        },
        caution: {
            bg: 'rgba(249, 115, 22, 0.15)',
            border: '#f97316',
            icon: 'warning',
            textColor: '#fdba74'
        },
        danger: {
            bg: 'rgba(239, 68, 68, 0.2)',
            border: '#ef4444',
            icon: 'alert-circle',
            textColor: '#fca5a5'
        }
    };

    const active = config[status.level];

    return (
        <TouchableOpacity
            activeOpacity={onPress ? 0.7 : 1}
            onPress={onPress}
            style={[styles.container, { backgroundColor: active.bg, borderColor: active.border }]}
        >
            <View style={[styles.iconBox, { backgroundColor: active.border }]}>
                <Ionicons name={active.icon} size={20} color="#fff" />
            </View>
            <View style={styles.content}>
                <Text style={[styles.label, { color: active.textColor }]}>
                    {getLabel(status.level, status.hazard)}
                </Text>
                <Text style={styles.subtext}>
                    {status.level === 'safe'
                        ? 'No active hazards within 10km'
                        : `${status.dist?.toFixed(1)}km from nearest hazard`}
                </Text>
            </View>
            {onPress && (
                <View style={styles.chevron}>
                    <Ionicons name="chevron-forward" size={16} color={active.textColor} />
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderLeftWidth: 6,
        marginHorizontal: 4,
        marginVertical: 4,
    },
    iconBox: {
        padding: 8,
        borderRadius: 10,
        marginRight: 12,
    },
    content: {
        flex: 1,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    subtext: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        marginTop: 2,
    },
    chevron: {
        marginLeft: 4,
    }
});
