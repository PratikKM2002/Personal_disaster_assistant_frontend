import { AppColors, BorderRadius } from '@/constants/Colors';
import { MOCK_NEIGHBORS, MOCK_SHARED_RESOURCES } from '@/constants/Data';
import { getStatusColor, makePhoneCall } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
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

type TabType = 'neighbors' | 'resources';

export default function CommunityScreen() {
    const [activeTab, setActiveTab] = useState<TabType>('neighbors');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredNeighbors = MOCK_NEIGHBORS.filter(n =>
        n.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                <Text style={styles.title}>Community</Text>
                <Text style={styles.subtitle}>Connect with neighbors during emergencies</Text>
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'neighbors' && styles.tabActive]}
                    onPress={() => setActiveTab('neighbors')}
                >
                    <Ionicons
                        name="people"
                        size={18}
                        color={activeTab === 'neighbors' ? '#fff' : '#9ca3af'}
                    />
                    <Text style={[styles.tabText, activeTab === 'neighbors' && styles.tabTextActive]}>
                        Neighbors
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'resources' && styles.tabActive]}
                    onPress={() => setActiveTab('resources')}
                >
                    <Ionicons
                        name="share-social"
                        size={18}
                        color={activeTab === 'resources' ? '#fff' : '#9ca3af'}
                    />
                    <Text style={[styles.tabText, activeTab === 'resources' && styles.tabTextActive]}>
                        Resources
                    </Text>
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
            {activeTab === 'neighbors' ? (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {/* Status Summary */}
                    <View style={styles.statusSummary}>
                        <View style={styles.statusItem}>
                            <Text style={styles.statusCount}>{MOCK_NEIGHBORS.filter(n => n.status === 'safe').length}</Text>
                            <Text style={styles.statusLabel}>Safe</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusCount, { color: '#ef4444' }]}>
                                {MOCK_NEIGHBORS.filter(n => n.status === 'needs-help').length}
                            </Text>
                            <Text style={styles.statusLabel}>Need Help</Text>
                        </View>
                        <View style={styles.statusItem}>
                            <Text style={[styles.statusCount, { color: '#3b82f6' }]}>
                                {MOCK_NEIGHBORS.filter(n => n.status === 'offering-help').length}
                            </Text>
                            <Text style={styles.statusLabel}>Offering</Text>
                        </View>
                    </View>

                    {/* Neighbor Cards */}
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
                                    <View style={styles.tagsRow}>
                                        {neighbor.canOffer.map((item, idx) => (
                                            <View key={idx} style={styles.offerTag}>
                                                <Text style={styles.offerTagText}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {neighbor.needs && neighbor.needs.length > 0 && (
                                    <View style={styles.tagsRow}>
                                        {neighbor.needs.map((item, idx) => (
                                            <View key={idx} style={styles.needTag}>
                                                <Text style={styles.needTagText}>{item}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

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
                    })}
                </ScrollView>
            ) : (
                <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                    {/* Add Resource Button */}
                    <TouchableOpacity style={styles.addResourceButton}>
                        <Ionicons name="add-circle" size={20} color="#3b82f6" />
                        <Text style={styles.addResourceText}>Share a Resource</Text>
                    </TouchableOpacity>

                    {/* Resource Cards */}
                    {MOCK_SHARED_RESOURCES.map((resource) => (
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
                                <Text style={styles.resourceTime}>{resource.timeAgo}</Text>
                            </View>
                            <Text style={styles.resourceTitle}>{resource.title}</Text>
                            <Text style={styles.resourceDesc}>{resource.description}</Text>
                            <View style={styles.resourceFooter}>
                                <Text style={styles.postedBy}>By {resource.postedBy}</Text>
                                <Text style={styles.resourceDistance}>{resource.distance}</Text>
                            </View>
                            <TouchableOpacity style={[
                                styles.claimButton,
                                { backgroundColor: resource.type === 'offering' ? '#22c55e' : '#f97316' }
                            ]}>
                                <Text style={styles.claimButtonText}>
                                    {resource.type === 'offering' ? 'Claim' : 'Offer Help'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    ))}
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
        padding: 8,
        borderRadius: 8,
        marginTop: 12,
    },
    specialNeedsText: {
        color: '#fca5a5',
        fontSize: 12,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 10,
    },
    offerTag: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    offerTagText: {
        color: '#86efac',
        fontSize: 11,
    },
    needTag: {
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        paddingHorizontal: 8,
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
    claimButton: {
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 12,
    },
    claimButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});
