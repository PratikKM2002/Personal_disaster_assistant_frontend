import { AppColors, BorderRadius } from '@/constants/Colors';
import { MOCK_ALERTS } from '@/constants/Data';
import { formatTimeAgo, openGoogleMapsNavigation } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type FilterType = 'all' | 'critical' | 'warning' | 'advisory' | 'info';

const FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'critical', label: 'Critical' },
    { id: 'warning', label: 'Warning' },
    { id: 'advisory', label: 'Advisory' },
];

export default function AlertsScreen() {
    const [filter, setFilter] = useState<FilterType>('all');
    const [alerts, setAlerts] = useState(MOCK_ALERTS);

    const filteredAlerts = alerts.filter(
        a => filter === 'all' || a.type === filter
    );

    const markAsRead = (id: string) => {
        setAlerts(prev => prev.map(a =>
            a.id === id ? { ...a, isRead: true } : a
        ));
    };

    const getSeverityStyles = (type: string) => {
        switch (type) {
            case 'critical':
                return {
                    bg: 'rgba(239, 68, 68, 0.15)',
                    border: '#ef4444',
                    icon: '#ef4444',
                    iconBg: 'rgba(239, 68, 68, 0.2)',
                };
            case 'warning':
                return {
                    bg: 'rgba(249, 115, 22, 0.15)',
                    border: '#f97316',
                    icon: '#f97316',
                    iconBg: 'rgba(249, 115, 22, 0.2)',
                };
            case 'advisory':
                return {
                    bg: 'rgba(234, 179, 8, 0.15)',
                    border: '#eab308',
                    icon: '#eab308',
                    iconBg: 'rgba(234, 179, 8, 0.2)',
                };
            default:
                return {
                    bg: 'rgba(59, 130, 246, 0.15)',
                    border: '#3b82f6',
                    icon: '#3b82f6',
                    iconBg: 'rgba(59, 130, 246, 0.2)',
                };
        }
    };

    const handleNavigate = (alert: typeof MOCK_ALERTS[0]) => {
        if (alert.actionDestination) {
            openGoogleMapsNavigation({
                lat: alert.actionDestination.coordinates[1],
                lng: alert.actionDestination.coordinates[0],
                name: alert.actionDestination.name,
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

            {/* Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContainer}
            >
                {FILTERS.map((f) => (
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

            {/* Alerts List */}
            <ScrollView
                style={styles.alertsList}
                contentContainerStyle={styles.alertsContent}
            >
                {filteredAlerts.map((alert) => {
                    const severity = getSeverityStyles(alert.type);
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
                            onPress={() => markAsRead(alert.id)}
                        >
                            <View style={styles.alertHeader}>
                                <View style={[styles.alertIconContainer, { backgroundColor: severity.iconBg }]}>
                                    <Ionicons
                                        name={alert.type === 'critical' ? 'alert-circle' : 'warning'}
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
    filterScroll: {
        maxHeight: 50,
    },
    filterContainer: {
        paddingHorizontal: 16,
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
    alertsList: {
        flex: 1,
        marginTop: 12,
    },
    alertsContent: {
        padding: 16,
        gap: 12,
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
