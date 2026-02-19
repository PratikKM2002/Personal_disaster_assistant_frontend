import NativeMap from '@/components/NativeMap';
import { AppColors, BorderRadius } from '@/constants/Colors';
import { MOCK_USER_LOCATION } from '@/constants/Data';
import { createFamily, FamilyMember, getFamilyMembers, getUserProfile, joinFamily, leaveFamily, removeFamilyMember, updateStatus } from '@/services/api';
import { formatTimeAgo, getStatusColor, makePhoneCall, openGoogleMapsNavigation, sendSMS } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LOCATION_BATTERY_TASK } from '../services/backgroundTask'; // This also registers the task

type ViewType = 'list' | 'map';

// UI-specific family member type extending the API type
interface UIFamilyMember {
    id: string;
    name: string;
    status: string;
    location: string;
    batteryLevel?: number;
    lastUpdate: string;
    coordinates?: [number, number];
    phone: string;
    relation: string;
    safety_message?: string;
}

export default function FamilyScreen() {
    const [family, setFamily] = useState<UIFamilyMember[]>([]);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [showJoinUI, setShowJoinUI] = useState(false);
    const [currentView, setCurrentView] = useState<ViewType>('list');
    const [userLocation, setUserLocation] = useState(MOCK_USER_LOCATION);
    const [simulatedFamily, setSimulatedFamily] = useState<UIFamilyMember[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const [showSafetyModal, setShowSafetyModal] = useState(false);
    const [safetyMessage, setSafetyMessage] = useState('');
    const [safetyStatus, setSafetyStatus] = useState<'safe' | 'needs-help' | 'offering-help'>('safe');

    const PRESET_MESSAGES = [
        "I need water",
        "I need medical aid",
        "I am trapped",
        "I need evacuation help",
        "Power outage"
    ];

    // Generate random family positions near the user
    const generateFamilyLocations = (center: { lat: number; lng: number }) => {
        return family.map((member) => { // Use 'family' state instead of MOCK_FAMILY
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

    useEffect(() => {
        loadFamily();
        getLocation();
        startBackgroundUpdates();
    }, []);

    const startBackgroundUpdates = async () => {
        if (Platform.OS === 'web') return;

        try {
            const { status } = await Location.requestBackgroundPermissionsAsync();
            if (status === 'granted') {
                await Location.startLocationUpdatesAsync(LOCATION_BATTERY_TASK, {
                    accuracy: Location.Accuracy.Balanced,
                    timeInterval: 15 * 60 * 1000, // 15 minutes
                    distanceInterval: 100, // 100 meters
                    foregroundService: {
                        notificationTitle: "Guardian AI Active",
                        notificationBody: "Monitoring location and safety status",
                        notificationColor: "#3b82f6"
                    }
                });
                console.log("Background location task started");
            }
        } catch (error) {
            console.log("Error starting background updates (likely missing permissions/plist):", error);
        }
    };

    const loadFamily = async () => {
        setLoading(true);
        try {
            const data = await getFamilyMembers();
            const me = await getUserProfile();
            setIsAdmin(me.role === 'admin');

            if (!data.family_id) {
                // No family at all -> Show Join/Create UI
                setShowJoinUI(true);
                setFamilyId(null);
                setFamily([]);
            } else {
                // Has family (even if empty) -> Show List/Map
                setShowJoinUI(false);
                setFamilyId(data.family_id);

                // Map backend members to UI format
                const mapped: UIFamilyMember[] = data.members.map((m: FamilyMember) => ({
                    id: String(m.id),
                    name: m.name,
                    status: m.safety_status || 'unknown',
                    location: m.last_address || (m.last_lat ? 'Last seen recently' : 'Unknown location'),
                    batteryLevel: m.battery_level || undefined,
                    lastUpdate: m.last_location_update ? formatTimeAgo(new Date(m.last_location_update)) : 'Never',
                    coordinates: (m.last_lat && m.last_lon) ? [m.last_lon, m.last_lat] : undefined,
                    phone: m.phone || '',
                    relation: 'Family',
                    safety_message: m.safety_message,
                }));
                setFamily(mapped);
                setSimulatedFamily(mapped); // For map view
            }
        } catch (err) {
            console.error('Failed to load family', err);
            Alert.alert('Error', 'Failed to load family data');
        } finally {
            setLoading(false);
        }
    };

    const handleJoinFamily = async () => {
        if (!joinCode) return;
        try {
            const res = await joinFamily(joinCode);
            if (res.action === 'created') {
                Alert.alert('Family Created', `You have created a new family group!\nCode: ${res.family_id}`);
            } else {
                Alert.alert('Joined Family', `You successfully joined the family!\nMembers: ${res.member_count}`);
            }
            setJoinCode('');
            loadFamily();
        } catch (err) {
            Alert.alert('Error', 'Failed to join family. Check the code and try again.');
        }
    };

    const handleCreateFamily = async () => {
        try {
            const res = await createFamily();
            Alert.alert('Family Created', `You have created a new family group!\nCode: ${res.family_id}\nShare this code with your family members.`);
            loadFamily();
        } catch (err) {
            Alert.alert('Error', 'Failed to create family.');
        }
    };

    const handleLeaveFamily = () => {
        Alert.alert(
            'Leave Family',
            'Are you sure you want to leave this family group?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await leaveFamily();
                            setFamilyId(null);
                            setFamily([]);
                            setShowJoinUI(true);
                            Alert.alert('Left Family', 'You have successfully left the family group.');
                        } catch (err) {
                            Alert.alert('Error', 'Failed to leave family.');
                            console.error(err);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleRemoveMember = (member: UIFamilyMember) => {
        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${member.name} from the family?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeFamilyMember(member.id);
                            Alert.alert('Success', 'Member removed successfully');
                            loadFamily();
                        } catch (err) {
                            Alert.alert('Error', 'Failed to remove member');
                        }
                    }
                }
            ]
        );
    };

    const handleMarkSafe = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required to mark yourself safe.');
                return;
            }

            const loc = await Location.getCurrentPositionAsync({});
            const battery = await getRealBatteryLevel();
            await updateStatus(loc.coords.latitude, loc.coords.longitude, 'safe', battery, 'Marked safe via Family');

            Alert.alert('Status Updated', 'You are marked as Safe.');
            loadFamily(); // Refresh list to show updated status
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to update status.');
        }
    };

    const handleReportIssue = async () => {
        if (!safetyMessage) {
            Alert.alert('Error', 'Please enter a message or select a preset.');
            return;
        }
        try {
            const loc = await Location.getCurrentPositionAsync({});
            await updateStatus(loc.coords.latitude, loc.coords.longitude, 'needs-help', 80, safetyMessage);
            Alert.alert('Success', 'Status updated successfully!');
            setShowSafetyModal(false);
            setSafetyMessage('');
            loadFamily();
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };



    const getLocation = async () => {
        try {
            if (Platform.OS === 'web') return; // Skip for web if needed, though getPositionAsync works on web usually

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

            // Push my location to backend
            const battery = await getRealBatteryLevel();
            await updateStatus(loc.lat, loc.lng, 'safe', battery);
        } catch (error) {
            console.error('Location error (permissions/plist?):', error);
        }
    };

    // Periodically shuffle family positions
    useEffect(() => {
        const interval = setInterval(() => {
            setSimulatedFamily(generateFamilyLocations(userLocation));
        }, 15000);
        return () => clearInterval(interval);
    }, [userLocation, family]); // Added 'family' to dependencies to ensure it uses the latest family data

    const markSafe = (id: string) => {
        // Optimistic update
        setFamily(prev => prev.map(m =>
            m.id === id ? { ...m, status: 'safe', lastUpdate: 'Just now' } : m
        ));
        // TODO: Only works for self really, but for demo UI we allow marking logic
    };

    const requestCheckIn = (id: string) => {
        const member = family.find(m => m.id === id);
        if (member) {
            sendSMS(member.phone, 'Please check in! Are you safe? Reply with your status.');
        }
    };

    const navigateToMember = (member: UIFamilyMember) => {
        if (member.coordinates) {
            openGoogleMapsNavigation({
                lat: member.coordinates[1],
                lng: member.coordinates[0],
                name: member.name,
            });
        } else {
            alert('Location not available');
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

    const getRealBatteryLevel = async () => {
        try {
            // Attempt to get battery on all platforms. 
            // On web, this works in Chrome/Edge. Safari will return -1 or throw.
            const level = await Battery.getBatteryLevelAsync();
            return level !== -1 ? Math.round(level * 100) : undefined;
        } catch (e) {
            console.log("Battery fetch failed (likely unsupported browser):", e);
            return undefined;
        }
    };

    if (loading && family.length === 0 && !showJoinUI) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
        );
    }

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
                <View>
                    <Text style={styles.title}>Family Status</Text>
                    {familyId && <Text style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center' }}>Code: {familyId}</Text>}
                </View>
                {!showJoinUI ? (
                    <TouchableOpacity
                        style={{ width: 40, height: 40, justifyContent: 'center', alignItems: 'center' }}
                        onPress={handleLeaveFamily}
                    >
                        <Ionicons name="exit-outline" size={24} color="#ef4444" />
                    </TouchableOpacity>
                ) : (
                    <View style={{ width: 40 }} />
                )}
            </View>

            {/* Join Family Input (if no family) */}
            {showJoinUI ? (
                <View style={{ padding: 16, alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                    <Ionicons name="people-outline" size={64} color="#6b7280" />
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16 }}>Join a Family Group</Text>
                    <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 8, marginBottom: 24 }}>
                        Enter a unique family code to join your loved ones.
                        Share this code with them to connect.
                    </Text>

                    <TextInput
                        style={{
                            backgroundColor: 'rgba(255,255,255,0.1)',
                            width: '100%',
                            padding: 16,
                            borderRadius: 12,
                            color: '#fff',
                            fontSize: 16,
                            textAlign: 'center',
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: 'rgba(255,255,255,0.2)'
                        }}
                        placeholder="Enter Family Code (e.g. SMITH_FAMILY)"
                        placeholderTextColor="#6b7280"
                        value={joinCode}
                        onChangeText={setJoinCode}
                        autoCapitalize="characters"
                    />

                    <TouchableOpacity
                        style={{
                            backgroundColor: '#3b82f6',
                            paddingVertical: 16,
                            paddingHorizontal: 32,
                            borderRadius: 12,
                            width: '100%',
                            alignItems: 'center',
                            marginBottom: 16
                        }}
                        onPress={handleJoinFamily}
                    >
                        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Join Existing Family</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            paddingVertical: 16,
                            paddingHorizontal: 32,
                            borderRadius: 12,
                            width: '100%',
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor: '#3b82f6'
                        }}
                        onPress={handleCreateFamily}
                    >
                        <Text style={{ color: '#3b82f6', fontSize: 16, fontWeight: '600' }}>Create New Family</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
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
                    {/* Safety Widget */}
                    <View style={styles.safetyWidget}>
                        <TouchableOpacity style={styles.safeBtnMain} onPress={handleMarkSafe}>
                            <Ionicons name="shield-checkmark" size={20} color="#fff" />
                            <Text style={styles.safeBtnText}>I'm Safe</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.reportBtnMain} onPress={() => setShowSafetyModal(true)}>
                            <Text style={styles.reportBtnText}>Report Issue / Update Status ▼</Text>
                        </TouchableOpacity>
                    </View>

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

                    {family.length === 0 ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
                            <Ionicons name="people" size={48} color="#4b5563" />
                            <Text style={{ color: '#9ca3af', marginTop: 16, fontSize: 16 }}>Waiting for family members...</Text>
                            <Text style={{ color: '#6b7280', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 }}>
                                Share code <Text style={{ color: '#fff', fontWeight: 'bold' }}>{familyId}</Text> with your family to let them join.
                            </Text>
                        </View>
                    ) : currentView === 'map' ? (
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
                                                        {member.status !== 'safe' && member.safety_message ? member.safety_message :
                                                            (member.status === 'safe' ? '✅ Safe' :
                                                                member.status === 'pending' ? '⏳ Pending' :
                                                                    member.status === 'danger' ? '🚨 In Danger' : '❓ Unknown')}
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
                                                        {member.status !== 'safe' && member.safety_message ? member.safety_message :
                                                            (member.status === 'safe' ? 'Safe' :
                                                                member.status === 'pending' ? 'Pending' :
                                                                    member.status === 'danger' ? 'In Danger' : 'Unknown')}
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
                                            {isAdmin && (
                                                <TouchableOpacity
                                                    style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
                                                    onPress={() => handleRemoveMember(member)}
                                                >
                                                    <Ionicons name="trash" size={16} color="#ef4444" />
                                                </TouchableOpacity>
                                            )}
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
                </>
            )}

            {/* SAFETY MODAL */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showSafetyModal}
                onRequestClose={() => setShowSafetyModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Safety Status</Text>
                        <Text style={styles.modalSub}>Select a message to notify family:</Text>

                        <View style={{ gap: 8, marginBottom: 16 }}>
                            {PRESET_MESSAGES.map(msg => (
                                <TouchableOpacity
                                    key={msg}
                                    style={[
                                        styles.presetBtn,
                                        safetyMessage === msg && styles.presetBtnActive
                                    ]}
                                    onPress={() => setSafetyMessage(msg)}
                                >
                                    <Text style={[styles.presetBtnText, safetyMessage === msg && { color: '#fff' }]}>{msg}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Or enter custom message..."
                            placeholderTextColor="#666"
                            value={safetyMessage}
                            onChangeText={setSafetyMessage}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowSafetyModal(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: '#ef4444' }]} onPress={handleReportIssue}>
                                <Text style={[styles.modalBtnText, { fontWeight: 'bold' }]}>SOS / Broadcast</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
    safetyWidget: {
        marginBottom: 16,
        paddingHorizontal: 16,
        gap: 8,
    },
    safeBtnMain: {
        backgroundColor: '#22c55e',
        borderRadius: BorderRadius.lg,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    safeBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    reportBtnMain: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: BorderRadius.lg,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    reportBtnText: {
        color: '#9ca3af',
        fontSize: 14,
        fontWeight: '500',
    },
    presetBtn: {
        backgroundColor: '#333',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    presetBtnActive: {
        backgroundColor: '#ef4444',
        borderColor: '#ef4444',
    },
    presetBtnText: {
        color: '#ccc',
        textAlign: 'center',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1f1f1f',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    modalSub: {
        color: '#9ca3af',
        marginBottom: 16,
    },
    modalInput: {
        backgroundColor: '#333',
        color: '#fff',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalBtnCancel: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    modalBtnConfirm: {
        backgroundColor: '#3b82f6',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    modalBtnText: {
        color: '#fff',
        fontSize: 16,
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
