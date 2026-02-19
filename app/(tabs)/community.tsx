import { AppColors, BorderRadius } from '@/constants/Colors';
import {
    addNeighbor,
    CommunityResource,
    createCommunityResource,
    getCommunityResources,
    getNeighbors,
    getUserProfile,
    removeNeighbor,
    updateStatus
} from '@/services/api';
import { formatTimeAgo, getStatusColor, makePhoneCall } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

type TabType = 'neighbors' | 'resources';

export default function CommunityScreen() {
    const [activeTab, setActiveTab] = useState<TabType>('neighbors');
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data State
    const [neighbors, setNeighbors] = useState<any[]>([]);
    const [resources, setResources] = useState<CommunityResource[]>([]);
    const [userProfile, setUserProfile] = useState<any>(null);

    // UI/Form State
    const [showAddNeighbor, setShowAddNeighbor] = useState(false);
    const [neighborTagInput, setNeighborTagInput] = useState('');

    const [showSafetyModal, setShowSafetyModal] = useState(false);
    const [safetyMessage, setSafetyMessage] = useState('');
    const [safetyStatus, setSafetyStatus] = useState<'safe' | 'needs-help' | 'offering-help'>('safe');

    const [showAddResource, setShowAddResource] = useState(false);
    const [newResTitle, setNewResTitle] = useState('');
    const [newResDesc, setNewResDesc] = useState('');
    const [newResType, setNewResType] = useState<'offering' | 'requesting'>('offering');

    const fetchData = useCallback(async () => {
        try {
            // Get location for resources
            const { status } = await Location.requestForegroundPermissionsAsync();
            let lat, lon;
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                lat = loc.coords.latitude;
                lon = loc.coords.longitude;
            }

            const [profile, neighborList, resourceList] = await Promise.all([
                getUserProfile(),
                getNeighbors(),
                getCommunityResources(lat, lon, 50)
            ]);

            setUserProfile(profile);
            setNeighbors(neighborList);
            setResources(resourceList);
        } catch (error) {
            console.error('Error fetching data:', error);
            // Don't alert on first load to be subtle, or maybe do?
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleAddNeighbor = async () => {
        if (!neighborTagInput.trim()) return;
        try {
            await addNeighbor(neighborTagInput.trim());
            Alert.alert('Success', 'Neighbor added successfully!');
            setNeighborTagInput('');
            setShowAddNeighbor(false);
            onRefresh();
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.error || 'Failed to add neighbor');
        }
    };

    const handleRemoveNeighbor = async (id: number, name: string) => {
        Alert.alert(
            'Remove Neighbor',
            `Are you sure you want to remove ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await removeNeighbor(id);
                            onRefresh();
                        } catch (error) {
                            Alert.alert('Error', 'Failed to remove neighbor');
                        }
                    }
                }
            ]
        );
    };

    const handleCreateResource = async () => {
        if (!newResTitle.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }
        try {
            const loc = await Location.getCurrentPositionAsync({});
            await createCommunityResource(
                newResType,
                newResTitle,
                newResDesc,
                loc.coords.latitude,
                loc.coords.longitude
            );
            Alert.alert('Success', 'Resource shared!');
            setNewResTitle('');
            setNewResDesc('');
            setShowAddResource(false);
            onRefresh();
        } catch (error) {
            Alert.alert('Error', 'Failed to create resource. Ensure location is enabled.');
        }
    };

    const handleMarkSafe = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location is required.');
                return;
            }
            const loc = await Location.getCurrentPositionAsync({});

            let battery = 80;
            try {
                if (Platform.OS !== 'web') {
                    const level = await Battery.getBatteryLevelAsync();
                    if (level !== -1) battery = Math.round(level * 100);
                }
            } catch (e) { console.log('Battery fetch failed', e); }

            await updateStatus(loc.coords.latitude, loc.coords.longitude, 'safe', battery, 'Marked safe via Community');
            Alert.alert('Success', 'You are marked as safe!');
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleReportIssue = async () => {
        if (!safetyMessage && safetyStatus !== 'safe') {
            Alert.alert('Error', 'Please enter a message or select a preset.');
            return;
        }
        try {
            const loc = await Location.getCurrentPositionAsync({});
            await updateStatus(loc.coords.latitude, loc.coords.longitude, 'needs-help', 80, safetyMessage);
            Alert.alert('Success', 'Status updated successfully!');
            setShowSafetyModal(false);
            setSafetyMessage('');
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const PRESET_MESSAGES = [
        "I need water",
        "I need medical aid",
        "I am trapped",
        "I need evacuation help",
        "Power outage"
    ];

    const filteredNeighbors = neighbors.filter(n =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredResources = resources.filter(r =>
        r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'safe': return 'checkmark-circle';
            case 'needs-help': return 'alert-circle';
            case 'offering-help': return 'heart';
            default: return 'time';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Community</Text>
                    <Text style={styles.subtitle}>Connect with neighbors during emergencies</Text>
                </View>
                {userProfile && (
                    <View style={styles.myTagContainer}>
                        <Text style={styles.myTagLabel}>MY TAG</Text>
                        <Text style={styles.myTagValue}>{userProfile.public_tag}</Text>
                    </View>
                )}
            </View>

            {/* SAFETY WIDGET */}
            <View style={styles.safetyWidget}>
                <TouchableOpacity style={styles.safeBtnMain} onPress={handleMarkSafe}>
                    <Ionicons name="shield-checkmark" size={24} color="#fff" />
                    <Text style={styles.safeBtnText}>I'M SAFE</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.reportBtnMain} onPress={() => setShowSafetyModal(true)}>
                    <Text style={styles.reportBtnText}>Report Issue / Update Status ▼</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'neighbors' && styles.tabActive]}
                    onPress={() => setActiveTab('neighbors')}
                >
                    <Ionicons name="people" size={18} color={activeTab === 'neighbors' ? '#fff' : '#9ca3af'} />
                    <Text style={[styles.tabText, activeTab === 'neighbors' && styles.tabTextActive]}>Neighbors</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'resources' && styles.tabActive]}
                    onPress={() => setActiveTab('resources')}
                >
                    <Ionicons name="share-social" size={18} color={activeTab === 'resources' ? '#fff' : '#9ca3af'} />
                    <Text style={[styles.tabText, activeTab === 'resources' && styles.tabTextActive]}>Resources</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#9ca3af" />
                <TextInput
                    style={styles.searchInput}
                    placeholder={activeTab === 'neighbors' ? 'Search neighbors...' : 'Search resources...'}
                    placeholderTextColor="#6b7280"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Content */}
            <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
            >
                {loading ? (
                    <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 20 }} />
                ) : activeTab === 'neighbors' ? (
                    <>
                        {/* Add Neighbor Button */}
                        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddNeighbor(true)}>
                            <Ionicons name="person-add" size={20} color="#fff" />
                            <Text style={styles.addBtnText}>Add Neighbor</Text>
                        </TouchableOpacity>

                        {/* Status Summary */}
                        <View style={styles.statusSummary}>
                            <View style={styles.statusItem}>
                                <Text style={styles.statusCount}>{neighbors.filter(n => n.safety_status === 'safe').length}</Text>
                                <Text style={styles.statusLabel}>Safe</Text>
                            </View>
                            <View style={styles.statusItem}>
                                <Text style={[styles.statusCount, { color: '#ef4444' }]}>
                                    {neighbors.filter(n => n.safety_status === 'needs-help').length}
                                </Text>
                                <Text style={styles.statusLabel}>Need Help</Text>
                            </View>
                            <View style={styles.statusItem}>
                                <Text style={[styles.statusCount, { color: '#3b82f6' }]}>
                                    {neighbors.filter(n => n.safety_status === 'offering-help').length}
                                </Text>
                                <Text style={styles.statusLabel}>Offering</Text>
                            </View>
                        </View>

                        {/* Neighbor Cards */}
                        {filteredNeighbors.length === 0 ? (
                            <Text style={styles.emptyText}>No neighbors added yet. Share your tag to connect!</Text>
                        ) : (
                            filteredNeighbors.map((neighbor) => {
                                const statusColors = getStatusColor(neighbor.safety_status || 'unknown');
                                return (
                                    <View key={neighbor.id} style={styles.neighborCard}>
                                        <View style={styles.neighborHeader}>
                                            <View style={[styles.avatar, { backgroundColor: statusColors.bg }]}>
                                                <Text style={styles.avatarText}>{neighbor.name[0]}</Text>
                                            </View>
                                            <View style={styles.neighborInfo}>
                                                <View style={styles.nameRow}>
                                                    <Text style={styles.neighborName}>{neighbor.name}</Text>
                                                    <TouchableOpacity onPress={() => handleRemoveNeighbor(neighbor.id, neighbor.name)}>
                                                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={styles.metaRow}>
                                                    <Ionicons
                                                        name={getStatusIcon(neighbor.safety_status) as any}
                                                        size={12}
                                                        color={statusColors.marker}
                                                    />
                                                    <Text style={[styles.statusText, { color: statusColors.text }]}>
                                                        {neighbor.safety_status !== 'safe' && neighbor.safety_message ? neighbor.safety_message :
                                                            (neighbor.safety_status === 'needs-help' ? 'Needs Help' :
                                                                neighbor.safety_status === 'offering-help' ? 'Offering Help' :
                                                                    neighbor.safety_status === 'safe' ? 'Safe' : 'Unknown')}
                                                    </Text>
                                                    {neighbor.last_location_update && (
                                                        <Text style={styles.distance}>• Updated {formatTimeAgo(new Date(neighbor.last_location_update))}</Text>
                                                    )}
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.neighborActions}>
                                            <TouchableOpacity style={styles.messageBtn}>
                                                <Ionicons name="chatbubble" size={16} color="#3b82f6" />
                                                <Text style={styles.messageBtnText}>Message</Text>
                                            </TouchableOpacity>
                                            {neighbor.phone && (
                                                <TouchableOpacity
                                                    style={styles.callBtn}
                                                    onPress={() => makePhoneCall(neighbor.phone!)}
                                                >
                                                    <Ionicons name="call" size={16} color="#22c55e" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </>
                ) : (
                    <>
                        {/* Add Resource Button */}
                        <TouchableOpacity style={styles.addResourceButton} onPress={() => setShowAddResource(true)}>
                            <Ionicons name="add-circle" size={20} color="#3b82f6" />
                            <Text style={styles.addResourceText}>Share a Resource</Text>
                        </TouchableOpacity>

                        {/* Resource Cards */}
                        {filteredResources.map((resource) => (
                            <View key={resource.id} style={styles.resourceCard}>
                                <View style={styles.resourceHeader}>
                                    <View style={[
                                        styles.resourceTypeBadge,
                                        { backgroundColor: resource.type === 'offering' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(249, 115, 22, 0.2)' }
                                    ]}>
                                        <Text style={[
                                            styles.resourceTypeText,
                                            { color: resource.type === 'offering' ? '#22c55e' : '#f97316' }
                                        ]}>
                                            {resource.type === 'offering' ? 'Offering' : 'Requesting'}
                                        </Text>
                                    </View>
                                    <Text style={styles.resourceTime}>{resource.created_at ? formatTimeAgo(new Date(resource.created_at)) : ''}</Text>
                                </View>
                                <Text style={styles.resourceTitle}>{resource.title}</Text>
                                <Text style={styles.resourceDesc}>{resource.description}</Text>
                                <View style={styles.resourceFooter}>
                                    <Text style={styles.postedBy}>By {resource.posted_by}</Text>
                                    <Text style={styles.resourceDistance}>{resource.dist_km ? `${Math.round(resource.dist_km * 10) / 10} km` : ''}</Text>
                                </View>
                            </View>
                        ))}
                    </>
                )}
            </ScrollView>

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
                        <Text style={styles.modalSub}>Select a message to notify neighbor/family:</Text>

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

            {/* Add Neighbor Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showAddNeighbor}
                onRequestClose={() => setShowAddNeighbor(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Neighbor</Text>
                        <Text style={styles.modalSub}>Enter their unique tag to add them.</Text>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. A1B2C3"
                            placeholderTextColor="#666"
                            value={neighborTagInput}
                            onChangeText={t => setNeighborTagInput(t.toUpperCase())}
                            maxLength={6}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowAddNeighbor(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleAddNeighbor}>
                                <Text style={[styles.modalBtnText, { fontWeight: 'bold' }]}>Add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Resource Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showAddResource}
                onRequestClose={() => setShowAddResource(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Share Resource</Text>

                        <View style={styles.typeSelector}>
                            <TouchableOpacity
                                style={[styles.typeBtn, newResType === 'offering' && styles.typeBtnOffering]}
                                onPress={() => setNewResType('offering')}
                            >
                                <Text style={[styles.typeBtnText, newResType === 'offering' && { color: '#fff' }]}>Offering</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.typeBtn, newResType === 'requesting' && styles.typeBtnRequesting]}
                                onPress={() => setNewResType('requesting')}
                            >
                                <Text style={[styles.typeBtnText, newResType === 'requesting' && { color: '#fff' }]}>Requesting</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.modalInput}
                            placeholder="Title (e.g. Water Bottles)"
                            placeholderTextColor="#666"
                            value={newResTitle}
                            onChangeText={setNewResTitle}
                        />

                        <TextInput
                            style={[styles.modalInput, { height: 80, textAlignVertical: 'top' }]}
                            placeholder="Description..."
                            placeholderTextColor="#666"
                            multiline
                            value={newResDesc}
                            onChangeText={setNewResDesc}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowAddResource(false)}>
                                <Text style={styles.modalBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnConfirm, { backgroundColor: newResType === 'offering' ? '#22c55e' : '#f97316' }]}
                                onPress={handleCreateResource}
                            >
                                <Text style={[styles.modalBtnText, { fontWeight: 'bold' }]}>Post</Text>
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
        padding: 16,
        paddingBottom: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    safetyWidget: {
        paddingHorizontal: 16,
        paddingBottom: 16,
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
    myTagContainer: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        padding: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    myTagLabel: {
        color: '#3b82f6',
        fontSize: 10,
        fontWeight: 'bold',
    },
    myTagValue: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    tabContainer: {
        flexDirection: 'row',
        marginHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
    },
    tabActive: {
        backgroundColor: '#3b82f6',
    },
    tabText: {
        color: '#9ca3af',
        fontSize: 14,
        fontWeight: '500',
    },
    tabTextActive: {
        color: '#fff',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        margin: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        borderRadius: 10,
        gap: 8,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        paddingVertical: 12,
        fontSize: 14,
    },
    list: {
        flex: 1,
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
        gap: 12,
        paddingBottom: 100,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3b82f6',
        padding: 12,
        borderRadius: 10,
        marginBottom: 10,
        gap: 8,
    },
    addBtnText: {
        color: '#fff',
        fontWeight: '600',
    },
    statusSummary: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        padding: 16,
        marginBottom: 8,
    },
    statusItem: {
        flex: 1,
        alignItems: 'center',
    },
    statusCount: {
        color: '#22c55e',
        fontSize: 24,
        fontWeight: '700',
    },
    statusLabel: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 4,
    },
    neighborCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    neighborHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    neighborInfo: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    neighborName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    distance: {
        color: '#9ca3af',
        fontSize: 11,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '500',
    },
    neighborActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    messageBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        paddingVertical: 10,
        borderRadius: 8,
    },
    messageBtnText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '500',
    },
    callBtn: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addResourceButton: {
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
    },
    addResourceText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '600',
    },
    resourceCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    resourceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    resourceTypeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    resourceTypeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    resourceTime: {
        color: '#9ca3af',
        fontSize: 11,
    },
    resourceTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 10,
    },
    resourceDesc: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        marginTop: 6,
        lineHeight: 20,
    },
    resourceFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    postedBy: {
        color: '#9ca3af',
        fontSize: 12,
    },
    resourceDistance: {
        color: '#3b82f6',
        fontSize: 12,
        fontWeight: '500',
    },
    emptyText: {
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 40,
        fontSize: 16,
    },

    // Modal Styles
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
    typeSelector: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    typeBtn: {
        flex: 1,
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
    },
    typeBtnOffering: {
        backgroundColor: '#22c55e',
        borderColor: '#22c55e',
    },
    typeBtnRequesting: {
        backgroundColor: '#f97316',
        borderColor: '#f97316',
    },
    typeBtnText: {
        color: '#9ca3af',
        fontWeight: '600',
    }
});
