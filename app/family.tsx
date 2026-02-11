import NativeMap from '@/components/NativeMap';
import { AppColors, BorderRadius } from '@/constants/Colors';
import { MOCK_FAMILY, MOCK_USER_LOCATION } from '@/constants/Data';
import { getStatusColor, makePhoneCall, openGoogleMapsNavigation, sendSMS } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type ViewType = 'list' | 'map';

export default function FamilyScreen() {
    const [family, setFamily] = useState(MOCK_FAMILY);
    const [currentView, setCurrentView] = useState<ViewType>('list');
    const [userLocation, setUserLocation] = useState(MOCK_USER_LOCATION);
    const [simulatedFamily, setSimulatedFamily] = useState(MOCK_FAMILY);

    // Generate random family positions near the user
    const generateFamilyLocations = (center: { lat: number; lng: number }) => {
        return MOCK_FAMILY.map((member) => {
            if (!member.coordinates) return member;
            const latOffset = (Math.random() - 0.5) * 0.04;
            const lngOffset = (Math.random() - 0.5) * 0.04;
            return {
                ...member,
                coordinates: [
                    center.lng + lngOffset,
                    center.lat + latOffset,
                ] as [number, number],
            };
        });
    };

    // Get user location and generate simulated family positions
    useEffect(() => {
        const getLocation = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') return;

                const currentLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                const loc = {
                    lat: currentLocation.coords.latitude,
                    lng: currentLocation.coords.longitude,
                };
                setUserLocation(loc);
                setSimulatedFamily(generateFamilyLocations(loc));
            } catch (error) {
                console.error('Location error:', error);
            }
        };

        getLocation();
    }, []);

    // Periodically shuffle family positions
    useEffect(() => {
        const interval = setInterval(() => {
            setSimulatedFamily(generateFamilyLocations(userLocation));
        }, 15000);
        return () => clearInterval(interval);
    }, [userLocation]);

    const markSafe = (id: string) => {
        setFamily(prev => prev.map(m =>
            m.id === id ? { ...m, status: 'safe' as const, lastUpdate: 'Just now' } : m
        ));
    };

    const requestCheckIn = (id: string) => {
        const member = family.find(m => m.id === id);
        if (member) {
            sendSMS(member.phone, 'Please check in! Are you safe? Reply with your status.');
        }
    };

    const navigateToMember = (member: typeof MOCK_FAMILY[0]) => {
        // Find the simulated version of this member (with random coords near user)
        const simMember = simulatedFamily.find(m => m.id === member.id);
        const coords = simMember?.coordinates || member.coordinates;
        if (coords) {
            openGoogleMapsNavigation({
                lat: coords[1],
                lng: coords[0],
                name: member.name,
            });
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'safe': return 'checkmark-circle';
            case 'danger': return 'alert-circle';
            case 'pending': return 'time';
            default: return 'help-circle';
        }
    };

    const getBatteryColor = (level?: number) => {
        if (!level) return '#6b7280';
        if (level > 50) return '#22c55e';
        if (level > 20) return '#eab308';
        return '#ef4444';
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Family Status</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Quick Status Bar */}
            <View style={styles.statusBar}>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.statusCount}>{family.filter(m => m.status === 'safe').length}</Text>
                    <Text style={styles.statusLabel}>Safe</Text>
                </View>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#eab308' }]} />
                    <Text style={styles.statusCount}>{family.filter(m => m.status === 'pending').length}</Text>
                    <Text style={styles.statusLabel}>Pending</Text>
                </View>
                <View style={styles.statusItem}>
                    <View style={[styles.statusDot, { backgroundColor: '#6b7280' }]} />
                    <Text style={styles.statusCount}>{family.filter(m => m.status === 'unknown').length}</Text>
                    <Text style={styles.statusLabel}>Unknown</Text>
                </View>
            </View>

            {/* Mark Myself Safe Button */}
            <TouchableOpacity style={styles.markSafeButton}>
                <Ionicons name="shield-checkmark" size={20} color="#fff" />
                <Text style={styles.markSafeText}>I'm Safe</Text>
            </TouchableOpacity>

            {/* View Toggle */}
            <View style={styles.viewToggle}>
                <TouchableOpacity
                    style={[styles.toggleButton, currentView === 'list' && styles.toggleActive]}
                    onPress={() => setCurrentView('list')}
                >
                    <Ionicons name="list" size={18} color={currentView === 'list' ? '#fff' : '#9ca3af'} />
                    <Text style={[styles.toggleText, currentView === 'list' && styles.toggleTextActive]}>List</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleButton, currentView === 'map' && styles.toggleActive]}
                    onPress={() => setCurrentView('map')}
                >
                    <Ionicons name="map" size={18} color={currentView === 'map' ? '#fff' : '#9ca3af'} />
                    <Text style={[styles.toggleText, currentView === 'map' && styles.toggleTextActive]}>Map</Text>
                </TouchableOpacity>
            </View>

            {currentView === 'map' ? (
                /* ===== MAP VIEW ===== */
                <View style={styles.mapSection}>
                    <View style={styles.familyMapContainer}>
                        <NativeMap
                            userLocation={userLocation}
                            resources={[]}
                            categoryColors={{}}
                            familyMembers={simulatedFamily}
                            isLiveLocation={true}
                        />
                    </View>

                    {/* Family member cards below map with Navigate buttons */}
                    <ScrollView style={styles.mapMemberList} contentContainerStyle={styles.mapMemberListContent}>
                        {simulatedFamily.filter(m => m.coordinates).map((member) => {
                            const statusColors = getStatusColor(member.status);
                            return (
                                <View key={member.id} style={styles.mapMemberCard}>
                                    <View style={styles.mapMemberInfo}>
                                        <View style={[styles.mapAvatar, { backgroundColor: statusColors.bg }]}>
                                            <Text style={styles.mapAvatarText}>{member.name[0]}</Text>
                                            <View style={[styles.statusIndicator, { backgroundColor: statusColors.marker }]} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.mapMemberName}>{member.name}</Text>
                                            <Text style={[styles.mapMemberStatus, { color: statusColors.text }]}>
                                                {member.status === 'safe' ? '✅ Safe' :
                                                    member.status === 'pending' ? '⏳ Pending' :
                                                        member.status === 'danger' ? '🚨 In Danger' : '❓ Unknown'}
                                                {' • '}{member.lastUpdate}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.mapMemberActions}>
                                        <TouchableOpacity
                                            style={styles.navigateToButton}
                                            onPress={() => navigateToMember(member)}
                                        >
                                            <Ionicons name="navigate" size={14} color="#fff" />
                                            <Text style={styles.navigateToText}>Navigate</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.mapCallButton}
                                            onPress={() => makePhoneCall(member.phone)}
                                        >
                                            <Ionicons name="call" size={14} color="#22c55e" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                </View>
            ) : (
                /* ===== LIST VIEW ===== */
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {family.map((member) => {
                        const statusColors = getStatusColor(member.status);
                        return (
                            <View key={member.id} style={styles.memberCard}>
                                <View style={styles.memberHeader}>
                                    <View style={[styles.avatar, { backgroundColor: statusColors.bg }]}>
                                        <Text style={styles.avatarText}>{member.name[0]}</Text>
                                        <View style={[styles.statusIndicator, { backgroundColor: statusColors.marker }]} />
                                    </View>
                                    <View style={styles.memberInfo}>
                                        <Text style={styles.memberName}>{member.name}</Text>
                                        <View style={styles.memberMeta}>
                                            <Ionicons
                                                name={getStatusIcon(member.status) as any}
                                                size={12}
                                                color={statusColors.marker}
                                            />
                                            <Text style={[styles.memberStatus, { color: statusColors.text }]}>
                                                {member.status === 'safe' ? 'Safe' :
                                                    member.status === 'pending' ? 'Pending' :
                                                        member.status === 'danger' ? 'In Danger' : 'Unknown'}
                                            </Text>
                                            <Text style={styles.memberTime}>• {member.lastUpdate}</Text>
                                        </View>
                                        {member.location && (
                                            <View style={styles.locationRow}>
                                                <Ionicons name="location" size={12} color="#9ca3af" />
                                                <Text style={styles.locationText}>{member.location}</Text>
                                            </View>
                                        )}
                                    </View>
                                    {member.batteryLevel !== undefined && (
                                        <View style={styles.batteryBox}>
                                            <Ionicons
                                                name={member.batteryLevel > 20 ? 'battery-half' : 'battery-dead'}
                                                size={16}
                                                color={getBatteryColor(member.batteryLevel)}
                                            />
                                            <Text style={[styles.batteryText, { color: getBatteryColor(member.batteryLevel) }]}>
                                                {member.batteryLevel}%
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.memberActions}>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => makePhoneCall(member.phone)}
                                    >
                                        <Ionicons name="call" size={16} color="#22c55e" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => sendSMS(member.phone)}
                                    >
                                        <Ionicons name="chatbubble" size={16} color="#3b82f6" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.actionButton}
                                        onPress={() => navigateToMember(member)}
                                    >
                                        <Ionicons name="navigate" size={16} color="#f97316" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.checkInButton}
                                        onPress={() => requestCheckIn(member.id)}
                                    >
                                        <Text style={styles.checkInText}>Request Check-in</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}

                    {/* Request All Check-in */}
                    <TouchableOpacity style={styles.requestAllButton}>
                        <Ionicons name="refresh" size={18} color="#3b82f6" />
                        <Text style={styles.requestAllText}>Request Check-in from All</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 12,
        marginHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
    },
    statusItem: {
        alignItems: 'center',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginBottom: 4,
    },
    statusCount: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    statusLabel: {
        color: '#9ca3af',
        fontSize: 11,
    },
    markSafeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#22c55e',
        marginHorizontal: 16,
        marginTop: 12,
        paddingVertical: 14,
        borderRadius: BorderRadius.lg,
    },
    markSafeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    viewToggle: {
        flexDirection: 'row',
        marginHorizontal: 16,
        marginTop: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8,
    },
    toggleActive: {
        backgroundColor: '#3b82f6',
    },
    toggleText: {
        color: '#9ca3af',
        fontSize: 14,
        fontWeight: '500',
    },
    toggleTextActive: {
        color: '#fff',
    },

    // ===== MAP VIEW STYLES =====
    mapSection: {
        flex: 1,
        marginTop: 12,
    },
    familyMapContainer: {
        height: 300,
        marginHorizontal: 16,
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
    },
    mapMemberList: {
        flex: 1,
    },
    mapMemberListContent: {
        padding: 16,
        gap: 10,
    },
    mapMemberCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        padding: 12,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    mapMemberInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    mapAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    mapAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    mapMemberName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    mapMemberStatus: {
        fontSize: 11,
        marginTop: 2,
    },
    mapMemberActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 10,
    },
    navigateToButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#3b82f6',
        paddingVertical: 8,
        borderRadius: 8,
    },
    navigateToText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    mapCallButton: {
        width: 40,
        height: 36,
        borderRadius: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ===== LIST VIEW STYLES =====
    list: {
        flex: 1,
        marginTop: 12,
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    memberCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    memberHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: AppColors.background,
    },
    memberInfo: {
        flex: 1,
        marginLeft: 12,
    },
    memberName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    memberMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    memberStatus: {
        fontSize: 12,
        fontWeight: '500',
    },
    memberTime: {
        color: '#9ca3af',
        fontSize: 11,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    locationText: {
        color: '#9ca3af',
        fontSize: 11,
    },
    batteryBox: {
        alignItems: 'center',
    },
    batteryText: {
        fontSize: 10,
        marginTop: 2,
    },
    memberActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 14,
    },
    actionButton: {
        width: 44,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkInButton: {
        flex: 1,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    checkInText: {
        color: '#3b82f6',
        fontSize: 13,
        fontWeight: '500',
    },
    requestAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        padding: 14,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
        marginTop: 8,
    },
    requestAllText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '600',
    },
});
