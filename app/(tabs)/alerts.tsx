import { AppColors, BorderRadius } from '@/constants/Colors';
import { useAlerts } from '@/contexts/AlertsContext';
import { useAuth } from '@/contexts/AuthContext';
import { BackendAlert, getAlerts } from '@/services/api';
import { Alert as AlertType } from '@/types';
import { formatTimeAgo, getHazardSeverity, getHazardSeverityStyles } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type FilterType = 'all' | 'critical' | 'warning' | 'advisory' | 'info';

const SEVERITY_FILTERS = [
    { id: 'all', label: 'All', minSev: 0 },
    { id: 'critical', label: 'Critical', minSev: 0.7 },
    { id: 'warning', label: 'Warning', minSev: 0.4 },
    { id: 'advisory', label: 'Advisory', minSev: 0.1 },
];

const DISTANCE_OPTIONS = [
    { label: '10 km', value: 10 },
    { label: '25 km', value: 25 },
    { label: '50 km', value: 50 },
    { label: '100 km', value: 100 },
    { label: '500 km', value: 500 },
];

export default function AlertsScreen() {
    const { isAuthenticated } = useAuth();
    const { setUnreadCount } = useAlerts();
    const [filter, setFilter] = useState<FilterType>('all');
    const [alerts, setAlerts] = useState<AlertType[]>([]);
    const [loading, setLoading] = useState(false);
    const [distanceKm, setDistanceKm] = useState(100);
    const [showDistancePicker, setShowDistancePicker] = useState(false);
    const [userLoc, setUserLoc] = useState<{ lat: number; lon: number } | null>(null);

    const fetchAlerts = useCallback(async (lat?: number, lon?: number, radius = distanceKm) => {
        setLoading(true);
        try {
            const backendAlerts = await getAlerts(lat, lon, radius);
            if (backendAlerts.length > 0) {
                const mapped: AlertType[] = backendAlerts.map((a: BackendAlert) => {
                    const sev = a.hazard_severity || 0;
                    const type = getHazardSeverity(sev);

                    return {
                        id: String(a.id),
                        type,
                        title: a.message.substring(0, 60) + (a.message.length > 60 ? '...' : ''),
                        description: a.message,
                        category: a.hazard_type ? (a.hazard_type.charAt(0).toUpperCase() + a.hazard_type.slice(1)) : 'Alert',
                        timestamp: new Date(a.created_at),
                        severity: sev,
                        actionDestination: (a.hazard_lat && a.hazard_lon) ? {
                            coordinates: [a.hazard_lon, a.hazard_lat],
                            name: a.hazard_title || 'Hazard Location',
                            icon: '⚠️'
                        } : undefined,
                        isRead: false,
                    };
                });
                setAlerts(mapped);
                setUnreadCount(mapped.filter(a => !a.isRead).length);
            } else {
                setAlerts([]);
                setUnreadCount(0);
            }
        } catch (err) {
            console.log('Failed to fetch alerts:', err);
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    }, [distanceKm]);

    // Get location and fetch alerts
    useEffect(() => {
        if (!isAuthenticated) return;

        (async () => {
            let lat, lon;
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({});
                    lat = loc.coords.latitude;
                    lon = loc.coords.longitude;
                    setUserLoc({ lat, lon });
                }
            } catch (e) {
                console.log("Location error in alerts:", e);
            }
            await fetchAlerts(lat, lon, distanceKm);
        })();
    }, [isAuthenticated, distanceKm]);

    // Apply client-side severity filter
    const filteredAlerts = alerts.filter(a => {
        if (filter === 'all') return true;
        return a.type === filter;
    });

    const markAsRead = (id: string) => {
        setAlerts(prev => {
            const updated = prev.map(a =>
                a.id === id ? { ...a, isRead: true } : a
            );
            setUnreadCount(updated.filter(a => !a.isRead).length);
            return updated;
        });
    };

    const getIconForHazard = (type: string | undefined) => {
        switch (type?.toLowerCase()) {
            case 'flood': return 'water';
            case 'wildfire': return 'flame';
            case 'tsunami': return 'boat';
            case 'earthquake': return 'pulse';
            default: return 'alert-circle';
        }
    };

    const router = useRouter();

    const handleNavigate = (alert: AlertType) => {
        if (alert.actionDestination) {
            router.push({
                pathname: '/(tabs)/map',
                params: {
                    lat: alert.actionDestination.coordinates[1],
                    lng: alert.actionDestination.coordinates[0],
                    hazardTitle: alert.title,
                }
            });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Alerts</Text>
                    <Text style={styles.subtitle}>{filteredAlerts.length} active alerts in your area</Text>
                </View>
                <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>{alerts.filter(a => !a.isRead).length} new</Text>
                </View>
            </View>

            {/* Distance + Severity Filters Row */}
            <View style={styles.filterRow}>
                {/* Distance Picker Button */}
                <TouchableOpacity
                    style={styles.distanceButton}
                    onPress={() => setShowDistancePicker(true)}
                >
                    <Ionicons name="location-outline" size={14} color="#9ca3af" />
                    <Text style={styles.distanceButtonText}>{distanceKm} km</Text>
                    <Ionicons name="chevron-down" size={12} color="#9ca3af" />
                </TouchableOpacity>

                {/* Severity Filter Chips */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterChips}
                >
                    {SEVERITY_FILTERS.map((f) => (
                        <TouchableOpacity
                            key={f.id}
                            style={[
                                styles.filterChip,
                                filter === f.id && styles.filterChipActive
                            ]}
                            onPress={() => setFilter(f.id as FilterType)}
                        >
                            <Text style={[
                                styles.filterLabel,
                                filter === f.id && styles.filterLabelActive
                            ]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Distance Modal */}
            <Modal
                visible={showDistancePicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDistancePicker(false)}
            >
                <Pressable
                    style={styles.modalOverlay}
                    onPress={() => setShowDistancePicker(false)}
                >
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Filter by Distance</Text>
                        {DISTANCE_OPTIONS.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[
                                    styles.distanceOption,
                                    distanceKm === opt.value && styles.distanceOptionActive
                                ]}
                                onPress={() => {
                                    setDistanceKm(opt.value);
                                    setShowDistancePicker(false);
                                }}
                            >
                                <Text style={[
                                    styles.distanceOptionText,
                                    distanceKm === opt.value && styles.distanceOptionTextActive
                                ]}>{opt.label}</Text>
                                {distanceKm === opt.value && (
                                    <Ionicons name="checkmark" size={18} color="#3b82f6" />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </Pressable>
            </Modal>

            {/* Alerts List */}
            <ScrollView
                style={styles.alertsList}
                contentContainerStyle={styles.alertsContent}
            >
                {loading && (
                    <View style={styles.loadingBox}>
                        <Text style={styles.loadingText}>Loading alerts...</Text>
                    </View>
                )}

                {!loading && filteredAlerts.length === 0 && (
                    <View style={styles.emptyBox}>
                        <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                        <Text style={styles.emptyTitle}>All Clear</Text>
                        <Text style={styles.emptySubtext}>No alerts within {distanceKm} km of your location</Text>
                    </View>
                )}

                {filteredAlerts.map((alert) => {
                    const severity = getHazardSeverityStyles(alert.type);
                    return (
                        <TouchableOpacity
                            key={alert.id}
                            style={[
                                styles.alertCard,
                                {
                                    backgroundColor: severity.bg,
                                    borderColor: severity.border,
                                },
                                !alert.isRead && styles.alertUnread
                            ]}
                            onPress={() => {
                                markAsRead(alert.id);
                                handleNavigate(alert);
                            }}
                        >
                            <View style={styles.alertHeader}>
                                <View style={[styles.alertIconContainer, { backgroundColor: severity.iconBg }]}>
                                    <Ionicons
                                        name={getIconForHazard(alert.category?.toLowerCase()) as any}
                                        size={20}
                                        color={severity.icon}
                                    />
                                </View>
                                <View style={styles.alertInfo}>
                                    <Text style={styles.alertTitle}>{alert.title}</Text>
                                    <View style={styles.alertMeta}>
                                        {alert.location && (
                                            <>
                                                <Ionicons name="location" size={12} color="#9ca3af" />
                                                <Text style={styles.alertLocation}>{alert.location}</Text>
                                            </>
                                        )}
                                        <Ionicons name="time" size={12} color="#9ca3af" />
                                        <Text style={styles.alertTime}>{formatTimeAgo(alert.timestamp)}</Text>
                                    </View>
                                </View>
                                {!alert.isRead && <View style={styles.unreadDot} />}
                            </View>

                            <Text style={styles.alertDescription}>{alert.description}</Text>

                            {alert.action && (
                                <View style={styles.actionBox}>
                                    <Ionicons name="arrow-forward-circle" size={16} color="#fff" />
                                    <Text style={styles.actionText}>{alert.action}</Text>
                                </View>
                            )}

                            {alert.actionDestination && (
                                <TouchableOpacity
                                    style={styles.navigateButton}
                                    onPress={() => handleNavigate(alert)}
                                >
                                    <Ionicons name="navigate" size={16} color="#fff" />
                                    <Text style={styles.navigateText}>{alert.actionLabel || 'Navigate'}</Text>
                                </TouchableOpacity>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: AppColors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        paddingBottom: 8,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
    },
    subtitle: {
        color: '#9ca3af',
        fontSize: 14,
        marginTop: 4,
    },
    unreadBadge: {
        backgroundColor: '#ef4444',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    unreadText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    // --- Filter Row ---
    filterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 10,
    },
    distanceButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    distanceButtonText: {
        color: '#d1d5db',
        fontSize: 13,
        fontWeight: '600',
    },
    // --- Modal ---
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#1f2937',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 8,
        width: 260,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    distanceOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 10,
    },
    distanceOptionActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
    },
    distanceOptionText: {
        color: '#d1d5db',
        fontSize: 15,
    },
    distanceOptionTextActive: {
        color: '#3b82f6',
        fontWeight: '700',
    },
    filterChips: {
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    filterChipActive: {
        backgroundColor: '#3b82f6',
    },
    filterLabel: {
        color: '#9ca3af',
        fontSize: 13,
        fontWeight: '500',
    },
    filterLabelActive: {
        color: '#fff',
    },
    // --- Alerts List ---
    alertsList: {
        flex: 1,
        marginTop: 4,
    },
    alertsContent: {
        padding: 16,
        gap: 12,
        paddingBottom: 60,
    },
    loadingBox: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        color: '#9ca3af',
        fontSize: 14,
    },
    emptyBox: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    emptySubtext: {
        color: '#6b7280',
        fontSize: 14,
    },
    alertCard: {
        borderRadius: BorderRadius.lg,
        padding: 16,
        borderWidth: 1,
    },
    alertUnread: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    alertIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertInfo: {
        flex: 1,
    },
    alertTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    alertMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    alertLocation: {
        color: '#9ca3af',
        fontSize: 11,
        marginRight: 8,
    },
    alertTime: {
        color: '#9ca3af',
        fontSize: 11,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#3b82f6',
    },
    alertDescription: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 13,
        lineHeight: 20,
        marginTop: 12,
    },
    actionBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 10,
        borderRadius: 8,
        marginTop: 12,
    },
    actionText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    navigateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#3b82f6',
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 12,
    },
    navigateText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

