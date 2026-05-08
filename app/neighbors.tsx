import { AppColors, BorderRadius } from '@/constants/Colors';
import {
    addNeighbor,
    getNeighbors,
    getProfile,
    removeNeighbor,
    updateStatus
} from '@/services/api';
import { formatTimeAgo, getStatusColor, makePhoneCall, sendSMS } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NeighborsScreen() {
    const [neighbors, setNeighbors] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Modal states
    const [showAddNeighbor, setShowAddNeighbor] = useState(false);
    const [neighborTagInput, setNeighborTagInput] = useState('');
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const PRESET_MESSAGES = [
        "I need water",
        "I need medical aid",
        "I am trapped",
        "I need evacuation help",
        "Power outage"
    ];

    const fetchData = useCallback(async () => {
        try {
            const [neighborList, profile] = await Promise.all([
                getNeighbors(),
                getProfile(),
            ]);
            setNeighbors(neighborList);
            setUserProfile(profile);
        } catch (error) {
            console.error('Error fetching neighbors:', error);
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
        Keyboard.dismiss();
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

    const handleMarkSafe = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required.');
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

            await updateStatus(loc.coords.latitude, loc.coords.longitude, 'safe', battery, 'Marked safe via Neighbors');
            Alert.alert('Success', 'You are marked as safe!');
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleReportIssue = async () => {
        Keyboard.dismiss();
        if (!statusMessage) {
            Alert.alert('Error', 'Please enter a message or select a preset.');
            return;
        }
        try {
            const loc = await Location.getCurrentPositionAsync({});
            await updateStatus(loc.coords.latitude, loc.coords.longitude, 'needs-help', 80, statusMessage);
            Alert.alert('Success', 'Status updated successfully!');
            setShowStatusModal(false);
            setStatusMessage('');
            fetchData();
        } catch (error) {
            Alert.alert('Error', 'Failed to update status');
        }
    };

    const handleInviteNeighbor = async () => {
        const tag = userProfile?.public_tag || 'your tag';
        try {
            await Share.share({
                message: `Join my neighbor network on Guardian AI! Add me using my tag: ${tag}\n\nDownload Guardian AI to stay connected during emergencies.`,
            });
        } catch (error) {
            console.log('Share cancelled');
        }
    };

    const filteredNeighbors = neighbors.filter(n => {
        const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = selectedFilter === 'all' ||
            n.safety_status === selectedFilter;
        return matchesSearch && matchesFilter;
    });

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'safe': return 'checkmark-circle';
            case 'needs-help': return 'alert-circle';
            case 'offering-help': return 'heart';
            default: return 'time';
        }
    };

    const currentStatus = userProfile?.safety_status || 'unknown';
    const statusDisplay = currentStatus === 'safe' ? 'Safe' :
        currentStatus === 'needs-help' ? 'Needs Help' :
            currentStatus === 'offering-help' ? 'Offering Help' : 'Unknown';
    const statusColor = currentStatus === 'safe' ? '#22c55e' :
        currentStatus === 'needs-help' ? '#ef4444' :
            currentStatus === 'offering-help' ? '#3b82f6' : '#6b7280';

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
                <Text style={styles.title}>Neighbor Network</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => setShowAddNeighbor(true)}
                >
                    <Ionicons name="person-add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* My Status Card */}
            <View style={[styles.myStatusCard, { borderColor: `${statusColor}44` }]}>
                <View style={styles.myStatusInfo}>
                    <Text style={styles.myStatusLabel}>Your Status</Text>
                    <View style={styles.myStatusBadge}>
                        <Ionicons
                            name={getStatusIcon(currentStatus) as any}
                            size={16}
                            color={statusColor}
                        />
                        <Text style={[styles.myStatusText, { color: statusColor }]}>{statusDisplay}</Text>
                    </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity
                        style={[styles.updateStatusButton, { backgroundColor: `${statusColor}33` }]}
                        onPress={handleMarkSafe}
                    >
                        <Text style={[styles.updateStatusText, { color: statusColor }]}>I'm Safe</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.updateStatusButton, { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}
                        onPress={() => setShowStatusModal(true)}
                    >
                        <Text style={[styles.updateStatusText, { color: '#ef4444' }]}>SOS</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={18} color="#9ca3af" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search neighbors..."
                    placeholderTextColor="#6b7280"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterScroll}
                contentContainerStyle={styles.filterContainer}
            >
                {[
                    { id: 'all', label: 'All' },
                    { id: 'safe', label: 'Safe' },
                    { id: 'needs-help', label: 'Needs Help' },
                    { id: 'offering-help', label: 'Offering' },
                ].map((filter) => (
                    <TouchableOpacity
                        key={filter.id}
                        style={[
                            styles.filterChip,
                            selectedFilter === filter.id && styles.filterChipActive
                        ]}
                        onPress={() => setSelectedFilter(filter.id)}
                    >
                        <Text style={[
                            styles.filterLabel,
                            selectedFilter === filter.id && styles.filterLabelActive
                        ]}>
                            {filter.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Neighbor List */}
            <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
                }
            >
                {loading ? (
                    <ActivityIndicator size="large" color={AppColors.primary} style={{ marginTop: 40 }} />
                ) : filteredNeighbors.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingTop: 40 }}>
                        <Ionicons name="people-outline" size={48} color="#4b5563" />
                        <Text style={styles.emptyText}>
                            {neighbors.length === 0
                                ? 'No neighbors added yet.\nShare your tag to connect!'
                                : 'No neighbors match your filter.'}
                        </Text>
                        {userProfile?.public_tag && (
                            <View style={styles.myTagBox}>
                                <Text style={styles.myTagLabel}>YOUR TAG</Text>
                                <Text style={styles.myTagValue}>{userProfile.public_tag}</Text>
                            </View>
                        )}
                    </View>
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
                                                {neighbor.safety_status !== 'safe' && neighbor.safety_message
                                                    ? neighbor.safety_message
                                                    : (neighbor.safety_status === 'needs-help' ? 'Needs Help' :
                                                        neighbor.safety_status === 'offering-help' ? 'Offering Help' :
                                                            neighbor.safety_status === 'safe' ? 'Safe' : 'Unknown')}
                                            </Text>
                                            {neighbor.last_location_update && (
                                                <Text style={styles.distance}>
                                                    • Updated {formatTimeAgo(new Date(neighbor.last_location_update))}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.neighborActions}>
                                    <TouchableOpacity
                                        style={styles.messageBtn}
                                        onPress={() => neighbor.phone && sendSMS(neighbor.phone)}
                                    >
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
                                    {neighbor.safety_status === 'needs-help' && (
                                        <TouchableOpacity
                                            style={styles.helpBtn}
                                            onPress={() => neighbor.phone && sendSMS(neighbor.phone, 'I can help! Where are you?')}
                                        >
                                            <Ionicons name="heart" size={16} color="#fff" />
                                            <Text style={styles.helpBtnText}>Offer Help</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        );
                    })
                )}

                {/* Invite Neighbors */}
                <TouchableOpacity style={styles.inviteButton} onPress={handleInviteNeighbor}>
                    <Ionicons name="person-add" size={20} color="#3b82f6" />
                    <Text style={styles.inviteText}>Invite Neighbors to Network</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Add Neighbor Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showAddNeighbor}
                onRequestClose={() => setShowAddNeighbor(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        style={styles.modalOverlay}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Add Neighbor</Text>
                            <Text style={styles.modalSub}>Enter their unique tag to add them.</Text>

                            {userProfile?.public_tag && (
                                <View style={[styles.myTagBox, { marginBottom: 16 }]}>
                                    <Text style={styles.myTagLabel}>YOUR TAG TO SHARE</Text>
                                    <Text style={styles.myTagValue}>{userProfile.public_tag}</Text>
                                </View>
                            )}

                            <TextInput
                                style={styles.modalInput}
                                placeholder="e.g. A1B2C3"
                                placeholderTextColor="#666"
                                value={neighborTagInput}
                                onChangeText={t => setNeighborTagInput(t.toUpperCase())}
                                maxLength={6}
                                returnKeyType="done"
                                blurOnSubmit={true}
                                onSubmitEditing={handleAddNeighbor}
                            />

                            <View style={styles.modalButtons}>
                                <TouchableOpacity
                                    style={styles.modalBtnCancel}
                                    onPress={() => { Keyboard.dismiss(); setShowAddNeighbor(false); }}
                                >
                                    <Text style={styles.modalBtnText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleAddNeighbor}>
                                    <Text style={[styles.modalBtnText, { fontWeight: 'bold' }]}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Status Update Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showStatusModal}
                onRequestClose={() => setShowStatusModal(false)}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <KeyboardAvoidingView
                        style={styles.modalOverlay}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    >
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Update Safety Status</Text>
                            <Text style={styles.modalSub}>Select a message to notify neighbors:</Text>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                                bounces={false}
                            >
                                <View style={{ gap: 8, marginBottom: 16 }}>
                                    {PRESET_MESSAGES.map(msg => (
                                        <TouchableOpacity
                                            key={msg}
                                            style={[
                                                styles.presetBtn,
                                                statusMessage === msg && styles.presetBtnActive
                                            ]}
                                            onPress={() => setStatusMessage(msg)}
                                        >
                                            <Text style={[styles.presetBtnText, statusMessage === msg && { color: '#fff' }]}>{msg}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <TextInput
                                    style={styles.modalInput}
                                    placeholder="Or enter custom message..."
                                    placeholderTextColor="#666"
                                    value={statusMessage}
                                    onChangeText={setStatusMessage}
                                    returnKeyType="done"
                                    blurOnSubmit={true}
                                    onSubmitEditing={Keyboard.dismiss}
                                />

                                <View style={styles.modalButtons}>
                                    <TouchableOpacity
                                        style={styles.modalBtnCancel}
                                        onPress={() => { Keyboard.dismiss(); setShowStatusModal(false); }}
                                    >
                                        <Text style={styles.modalBtnText}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.modalBtnConfirm, { backgroundColor: '#ef4444' }]}
                                        onPress={handleReportIssue}
                                    >
                                        <Text style={[styles.modalBtnText, { fontWeight: 'bold' }]}>SOS / Broadcast</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </KeyboardAvoidingView>
                </TouchableWithoutFeedback>
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
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    myStatusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        marginHorizontal: 16,
        padding: 14,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    myStatusInfo: {},
    myStatusLabel: {
        color: '#9ca3af',
        fontSize: 11,
    },
    myStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    myStatusText: {
        color: '#22c55e',
        fontSize: 15,
        fontWeight: '600',
    },
    updateStatusButton: {
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    updateStatusText: {
        color: '#22c55e',
        fontSize: 13,
        fontWeight: '600',
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
    filterScroll: {
        maxHeight: 45,
    },
    filterContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    filterChipActive: {
        backgroundColor: '#3b82f6',
    },
    filterLabel: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: '500',
    },
    filterLabelActive: {
        color: '#fff',
    },
    list: {
        flex: 1,
        marginTop: 8,
    },
    listContent: {
        padding: 16,
        gap: 12,
        paddingBottom: 100,
    },
    emptyText: {
        color: '#9ca3af',
        textAlign: 'center',
        marginTop: 16,
        fontSize: 14,
        lineHeight: 20,
    },
    myTagBox: {
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 16,
    },
    myTagLabel: {
        color: '#3b82f6',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    myTagValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 2,
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
        marginTop: 14,
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
        fontSize: 13,
        fontWeight: '500',
    },
    callBtn: {
        width: 44,
        height: 40,
        borderRadius: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    helpBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ef4444',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
    },
    helpBtnText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    inviteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        padding: 16,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
        marginTop: 8,
    },
    inviteText: {
        color: '#3b82f6',
        fontSize: 14,
        fontWeight: '600',
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
});
