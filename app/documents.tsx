import { AppColors, BorderRadius } from '@/constants/Colors';
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

interface Document {
    id: string;
    name: string;
    type: 'id' | 'insurance' | 'medical' | 'property' | 'other';
    icon: string;
    lastUpdated: string;
    isVerified: boolean;
}

const MOCK_DOCUMENTS: Document[] = [
    { id: '1', name: 'Driver License', type: 'id', icon: '🪪', lastUpdated: '3 days ago', isVerified: true },
    { id: '2', name: 'Passport', type: 'id', icon: '📕', lastUpdated: '1 week ago', isVerified: true },
    { id: '3', name: 'Home Insurance', type: 'insurance', icon: '🏠', lastUpdated: '2 weeks ago', isVerified: true },
    { id: '4', name: 'Car Insurance', type: 'insurance', icon: '🚗', lastUpdated: '1 month ago', isVerified: false },
    { id: '5', name: 'Medical Records', type: 'medical', icon: '🏥', lastUpdated: '5 days ago', isVerified: true },
    { id: '6', name: 'Property Deed', type: 'property', icon: '📜', lastUpdated: '3 months ago', isVerified: true },
];

const CATEGORIES = [
    { id: 'all', label: 'All', icon: 'folder-open' },
    { id: 'id', label: 'IDs', icon: 'card' },
    { id: 'insurance', label: 'Insurance', icon: 'shield-checkmark' },
    { id: 'medical', label: 'Medical', icon: 'medkit' },
    { id: 'property', label: 'Property', icon: 'home' },
];

export default function DocumentsScreen() {
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [documents, setDocuments] = useState(MOCK_DOCUMENTS);

    const filteredDocs = documents.filter(
        d => selectedCategory === 'all' || d.type === selectedCategory
    );

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
                <Text style={styles.title}>Document Vault</Text>
                <TouchableOpacity style={styles.addButton}>
                    <Ionicons name="add" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
                <Ionicons name="lock-closed" size={18} color="#22c55e" />
                <Text style={styles.infoText}>
                    Your documents are encrypted and stored securely
                </Text>
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
                            selectedCategory === cat.id && styles.categoryChipActive
                        ]}
                        onPress={() => setSelectedCategory(cat.id)}
                    >
                        <Ionicons
                            name={cat.icon as any}
                            size={16}
                            color={selectedCategory === cat.id ? '#fff' : '#9ca3af'}
                        />
                        <Text style={[
                            styles.categoryLabel,
                            selectedCategory === cat.id && styles.categoryLabelActive
                        ]}>
                            {cat.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Document List */}
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {filteredDocs.map((doc) => (
                    <TouchableOpacity key={doc.id} style={styles.docCard}>
                        <View style={styles.docIcon}>
                            <Text style={{ fontSize: 28 }}>{doc.icon}</Text>
                        </View>
                        <View style={styles.docInfo}>
                            <View style={styles.docNameRow}>
                                <Text style={styles.docName}>{doc.name}</Text>
                                {doc.isVerified && (
                                    <View style={styles.verifiedBadge}>
                                        <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                                    </View>
                                )}
                            </View>
                            <Text style={styles.docMeta}>Updated {doc.lastUpdated}</Text>
                        </View>
                        <View style={styles.docActions}>
                            <TouchableOpacity style={styles.docAction}>
                                <Ionicons name="eye-outline" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.docAction}>
                                <Ionicons name="share-outline" size={20} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                ))}

                {/* Add Document Button */}
                <TouchableOpacity style={styles.addDocButton}>
                    <Ionicons name="cloud-upload-outline" size={24} color="#3b82f6" />
                    <Text style={styles.addDocTitle}>Add Document</Text>
                    <Text style={styles.addDocSubtitle}>
                        Take a photo or upload from gallery
                    </Text>
                </TouchableOpacity>

                {/* Tip Card */}
                <View style={styles.tipCard}>
                    <Ionicons name="bulb" size={20} color="#eab308" />
                    <View style={styles.tipContent}>
                        <Text style={styles.tipTitle}>Pro Tip</Text>
                        <Text style={styles.tipText}>
                            Keep digital copies of important documents accessible during emergencies
                            when you may not have access to physical copies.
                        </Text>
                    </View>
                </View>
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
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        marginHorizontal: 16,
        padding: 12,
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    infoText: {
        color: '#86efac',
        fontSize: 13,
        flex: 1,
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
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    categoryChipActive: {
        backgroundColor: '#3b82f6',
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
        gap: 10,
    },
    docCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 14,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    docIcon: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    docInfo: {
        flex: 1,
        marginLeft: 12,
    },
    docNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    docName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
    },
    verifiedBadge: {},
    docMeta: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 4,
    },
    docActions: {
        flexDirection: 'row',
        gap: 4,
    },
    docAction: {
        width: 36,
        height: 36,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addDocButton: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
        marginTop: 8,
    },
    addDocTitle: {
        color: '#3b82f6',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
    },
    addDocSubtitle: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 4,
    },
    tipCard: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: 'rgba(234, 179, 8, 0.1)',
        padding: 14,
        borderRadius: BorderRadius.lg,
        marginTop: 16,
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        color: '#fbbf24',
        fontSize: 14,
        fontWeight: '600',
    },
    tipText: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 4,
        lineHeight: 18,
    },
});
