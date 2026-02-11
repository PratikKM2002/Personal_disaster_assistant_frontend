import { AppColors, BorderRadius } from '@/constants/Colors';
import { MOCK_SHARED_RESOURCES } from '@/constants/Data';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type FilterType = 'all' | 'offering' | 'requesting';

const CATEGORIES = [
    { id: 'all', label: 'All', icon: '📦' },
    { id: 'water', label: 'Water', icon: '💧' },
    { id: 'food', label: 'Food', icon: '🍞' },
    { id: 'shelter', label: 'Shelter', icon: '🏠' },
    { id: 'transport', label: 'Transport', icon: '🚗' },
    { id: 'medical', label: 'Medical', icon: '🏥' },
];

export default function ResourcesScreen() {
    const [resources, setResources] = useState(MOCK_SHARED_RESOURCES);
    const [typeFilter, setTypeFilter] = useState<FilterType>('all');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const filteredResources = resources.filter(r => {
        const matchesType = typeFilter === 'all' || r.type === typeFilter;
        const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
        return matchesType && matchesCategory;
    });

    const claimResource = (id: string) => {
        setResources(prev => prev.map(r =>
            r.id === id ? { ...r, claimed: true } : r
        ));
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
                <Text style={styles.title}>Resource Sharing</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Type Tabs */}
            <View style={styles.typeTabs}>
                {[
                    { id: 'all', label: 'All' },
                    { id: 'offering', label: 'Offering' },
                    { id: 'requesting', label: 'Requests' },
                ].map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[styles.typeTab, typeFilter === tab.id && styles.typeTabActive]}
                        onPress={() => setTypeFilter(tab.id as FilterType)}
                    >
                        <Text style={[
                            styles.typeTabText,
                            typeFilter === tab.id && styles.typeTabTextActive
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Category Filter */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContainer}
            >
                {CATEGORIES.map((cat) => (
                    <TouchableOpacity
                        key={cat.id}
                        style={[
                            styles.categoryChip,
                            categoryFilter === cat.id && styles.categoryChipActive
                        ]}
                        onPress={() => setCategoryFilter(cat.id)}
                    >
                        <Text style={styles.categoryIcon}>{cat.icon}</Text>
                        <Text style={[
                            styles.categoryLabel,
                            categoryFilter === cat.id && styles.categoryLabelActive
                        ]}>
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Resource List */}
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity style={styles.offerButton}>
                        <Ionicons name="gift-outline" size={20} color="#fff" />
                        <Text style={styles.offerButtonText}>Offer Resource</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.requestButton}>
                        <Ionicons name="hand-left-outline" size={20} color="#f97316" />
                        <Text style={styles.requestButtonText}>Request Help</Text>
                    </TouchableOpacity>
                </View>

                {/* Resources */}
                {filteredResources.map((resource) => (
                    <View
                        key={resource.id}
                        style={[
                            styles.resourceCard,
                            resource.claimed && styles.resourceCardClaimed
                        ]}
                    >
                        <View style={styles.resourceHeader}>
                            <View style={[
                                styles.typeBadge,
                                {
                                    backgroundColor: resource.type === 'offering'
                                        ? 'rgba(34, 197, 94, 0.2)'
                                        : 'rgba(249, 115, 22, 0.2)'
                                }
                            ]}>
                                <Text style={[
                                    styles.typeBadgeText,
                                    { color: resource.type === 'offering' ? '#22c55e' : '#f97316' }
                                ]}>
                                    {resource.type === 'offering' ? 'Offering' : 'Requesting'}
                                </Text>
                            </View>
                            <Text style={styles.timeAgo}>{resource.timeAgo}</Text>
                        </View>

                        <Text style={styles.resourceTitle}>{resource.title}</Text>
                        <Text style={styles.resourceDescription}>{resource.description}</Text>

                        <View style={styles.resourceMeta}>
                            <View style={styles.metaItem}>
                                <Ionicons name="person" size={12} color="#9ca3af" />
                                <Text style={styles.metaText}>{resource.postedBy}</Text>
                            </View>
                            <View style={styles.metaItem}>
                                <Ionicons name="location" size={12} color="#9ca3af" />
                                <Text style={styles.metaText}>{resource.distance}</Text>
                            </View>
                            {resource.quantity && (
                                <View style={styles.metaItem}>
                                    <Ionicons name="cube" size={12} color="#9ca3af" />
                                    <Text style={styles.metaText}>{resource.quantity}</Text>
                                </View>
                            )}
                        </View>

                        {resource.claimed ? (
                            <View style={styles.claimedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                                <Text style={styles.claimedText}>Claimed</Text>
                            </View>
                        ) : (
                            <View style={styles.resourceActions}>
                                <TouchableOpacity
                                    style={styles.messageButton}
                                >
                                    <Ionicons name="chatbubble-outline" size={16} color="#3b82f6" />
                                    <Text style={styles.messageButtonText}>Message</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.actionButton,
                                        { backgroundColor: resource.type === 'offering' ? '#22c55e' : '#f97316' }
                                    ]}
                                    onPress={() => claimResource(resource.id)}
                                >
                                    <Text style={styles.actionButtonText}>
                                        {resource.type === 'offering' ? 'Claim' : 'Offer Help'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ))}

                {filteredResources.length === 0 && (
                    <View style={styles.emptyState}>
                        <Ionicons name="cube-outline" size={48} color="#6b7280" />
                        <Text style={styles.emptyTitle}>No resources found</Text>
                        <Text style={styles.emptyText}>
                            Try adjusting your filters or be the first to share!
                        </Text>
                    </View>
                )}
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
    typeTabs: {
        flexDirection: 'row',
        marginHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 4,
    },
    typeTab: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    typeTabActive: {
        backgroundColor: '#3b82f6',
    },
    typeTabText: {
        color: '#9ca3af',
        fontSize: 13,
        fontWeight: '500',
    },
    typeTabTextActive: {
        color: '#fff',
    },
    categoryScroll: {
        maxHeight: 50,
        marginTop: 12,
    },
    categoryContainer: {
        paddingHorizontal: 16,
        gap: 8,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    categoryChipActive: {
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1,
        borderColor: '#3b82f6',
    },
    categoryIcon: {
        fontSize: 14,
    },
    categoryLabel: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: '500',
    },
    categoryLabelActive: {
        color: '#fff',
    },
    list: {
        flex: 1,
        marginTop: 12,
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    quickActions: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8,
    },
    offerButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#22c55e',
        paddingVertical: 12,
        borderRadius: BorderRadius.lg,
    },
    offerButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    requestButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        paddingVertical: 12,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: '#f97316',
    },
    requestButtonText: {
        color: '#f97316',
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
    resourceCardClaimed: {
        opacity: 0.6,
    },
    resourceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    typeBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    timeAgo: {
        color: '#9ca3af',
        fontSize: 11,
    },
    resourceTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    resourceDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        lineHeight: 20,
        marginTop: 6,
    },
    resourceMeta: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 12,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: '#9ca3af',
        fontSize: 11,
    },
    claimedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        paddingVertical: 10,
        borderRadius: 8,
        marginTop: 12,
    },
    claimedText: {
        color: '#22c55e',
        fontSize: 14,
        fontWeight: '600',
    },
    resourceActions: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    messageButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        paddingVertical: 10,
        borderRadius: 8,
    },
    messageButtonText: {
        color: '#3b82f6',
        fontSize: 13,
        fontWeight: '500',
    },
    actionButton: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 13,
        textAlign: 'center',
        marginTop: 4,
    },
});
