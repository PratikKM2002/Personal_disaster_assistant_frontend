import { AppColors, BorderRadius } from '@/constants/Colors';
import { MOCK_NEIGHBORS } from '@/constants/Data';
import { getStatusColor, makePhoneCall, sendSMS } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function NeighborsScreen() {
    const [neighbors, setNeighbors] = useState(MOCK_NEIGHBORS);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedFilter, setSelectedFilter] = useState('all');

    const filteredNeighbors = neighbors.filter(n => {
        const matchesSearch = n.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = selectedFilter === 'all' || n.status === selectedFilter;
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

    const updateStatus = () => {
        // Would trigger a status update flow
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
                <Text style={styles.title}>Neighbor Network</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="person-add" size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* My Status Card */}
            <View style={styles.myStatusCard}>
                <View style={styles.myStatusInfo}>
                    <Text style={styles.myStatusLabel}>Your Status</Text>
                    <View style={styles.myStatusBadge}>
                        <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                        <Text style={styles.myStatusText}>Safe</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.updateStatusButton}
                    onPress={updateStatus}
                >
                    <Text style={styles.updateStatusText}>Update</Text>
                </TouchableOpacity>
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
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {filteredNeighbors.map((neighbor) => {
                    const statusColors = getStatusColor(neighbor.status);
                    return (
                        <View key={neighbor.id} style={styles.neighborCard}>
                            <View style={styles.neighborHeader}>
                                <View style={[styles.avatar, { backgroundColor: statusColors.bg }]}>
                                    <Text style={styles.avatarText}>{neighbor.name[0]}</Text>
                                </View>
                                <View style={styles.neighborInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={styles.neighborName}>{neighbor.name}</Text>
                                        {neighbor.apartment && (
                                            <Text style={styles.apartment}>{neighbor.apartment}</Text>
                                        )}
                                    </View>
                                    <View style={styles.metaRow}>
                                        <Ionicons name="location" size={12} color="#9ca3af" />
                                        <Text style={styles.distance}>{neighbor.distance}</Text>
                                        <Ionicons
                                            name={getStatusIcon(neighbor.status) as any}
                                            size={12}
                                            color={statusColors.marker}
                                        />
                                        <Text style={[styles.statusText, { color: statusColors.text }]}>
                                            {neighbor.status === 'needs-help' ? 'Needs Help' :
                                                neighbor.status === 'offering-help' ? 'Offering Help' :
                                                    neighbor.status === 'safe' ? 'Safe' : 'Unknown'}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {neighbor.specialNeeds && (
                                <View style={styles.specialNeedsBox}>
                                    <Ionicons name="alert-circle" size={14} color="#ef4444" />
                                    <Text style={styles.specialNeedsText}>{neighbor.specialNeeds}</Text>
                                </View>
                            )}

                            {neighbor.canOffer && neighbor.canOffer.length > 0 && (
                                <View style={styles.tagsSection}>
                                    <Text style={styles.tagsLabel}>Can Offer:</Text>
                                    <View style={styles.tagsRow}>
                                        {neighbor.canOffer.map((item, idx) => (
                                            <View key={idx} style={styles.offerTag}>
                                                <Text style={styles.offerTagText}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {neighbor.needs && neighbor.needs.length > 0 && (
                                <View style={styles.tagsSection}>
                                    <Text style={styles.tagsLabel}>Needs:</Text>
                                    <View style={styles.tagsRow}>
                                        {neighbor.needs.map((item, idx) => (
                                            <View key={idx} style={styles.needTag}>
                                                <Text style={styles.needTagText}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

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
                                {neighbor.status === 'needs-help' && (
                                    <TouchableOpacity style={styles.helpBtn}>
                                        <Ionicons name="heart" size={16} color="#fff" />
                                        <Text style={styles.helpBtnText}>Offer Help</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    );
                })}

                {/* Invite Neighbors */}
                <TouchableOpacity style={styles.inviteButton}>
                    <Ionicons name="person-add" size={20} color="#3b82f6" />
                    <Text style={styles.inviteText}>Invite Neighbors to Network</Text>
                </TouchableOpacity>
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
        gap: 8,
    },
    neighborName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    apartment: {
        color: '#9ca3af',
        fontSize: 12,
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
        marginRight: 8,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '500',
    },
    specialNeedsBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        padding: 10,
        borderRadius: 8,
        marginTop: 12,
    },
    specialNeedsText: {
        color: '#fca5a5',
        fontSize: 12,
        flex: 1,
    },
    tagsSection: {
        marginTop: 10,
    },
    tagsLabel: {
        color: '#9ca3af',
        fontSize: 10,
        marginBottom: 6,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    offerTag: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    offerTagText: {
        color: '#86efac',
        fontSize: 11,
    },
    needTag: {
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    needTagText: {
        color: '#fdba74',
        fontSize: 11,
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
});
