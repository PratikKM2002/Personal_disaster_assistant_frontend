import { AppColors, BorderRadius } from '@/constants/Colors';
import { EMERGENCY_KIT } from '@/constants/Data';
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

export default function KitScreen() {
    const [categories, setCategories] = useState(EMERGENCY_KIT);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('water');

    const toggleItem = (categoryId: string, itemId: string) => {
        setCategories(prev => prev.map(cat =>
            cat.id === categoryId
                ? {
                    ...cat,
                    items: cat.items.map(item =>
                        item.id === itemId ? { ...item, checked: !item.checked } : item
                    )
                }
                : cat
        ));
    };

    const getProgress = () => {
        const total = categories.reduce((acc, cat) => acc + cat.items.length, 0);
        const checked = categories.reduce((acc, cat) =>
            acc + cat.items.filter(item => item.checked).length, 0
        );
        return { checked, total, percentage: Math.round((checked / total) * 100) };
    };

    const progress = getProgress();

    const getCategoryColor = (color: string) => {
        switch (color) {
            case 'blue': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' };
            case 'red': return { bg: 'rgba(239, 68, 68, 0.2)', text: '#ef4444' };
            case 'orange': return { bg: 'rgba(249, 115, 22, 0.2)', text: '#f97316' };
            case 'gray': return { bg: 'rgba(107, 114, 128, 0.2)', text: '#6b7280' };
            default: return { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' };
        }
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
                <Text style={styles.title}>Emergency Kit</Text>
                <TouchableOpacity style={styles.shareButton}>
                    <Ionicons name="share-outline" size={22} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Progress Card */}
            <View style={styles.progressCard}>
                <View style={styles.progressInfo}>
                    <Text style={styles.progressTitle}>Kit Readiness</Text>
                    <Text style={styles.progressText}>
                        {progress.checked} of {progress.total} items ready
                    </Text>
                </View>
                <View style={styles.progressCircle}>
                    <Text style={styles.progressPercent}>{progress.percentage}%</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress.percentage}%` }]} />
            </View>

            {/* Categories */}
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
                {categories.map((category) => {
                    const colors = getCategoryColor(category.color);
                    const categoryProgress = category.items.filter(i => i.checked).length;
                    const isExpanded = expandedCategory === category.id;

                    return (
                        <View key={category.id} style={styles.categoryCard}>
                            <TouchableOpacity
                                style={styles.categoryHeader}
                                onPress={() => setExpandedCategory(isExpanded ? null : category.id)}
                            >
                                <View style={[styles.categoryIcon, { backgroundColor: colors.bg }]}>
                                    <Text style={{ fontSize: 20 }}>{category.icon}</Text>
                                </View>
                                <View style={styles.categoryInfo}>
                                    <Text style={styles.categoryName}>{category.name}</Text>
                                    <Text style={styles.categoryProgress}>
                                        {categoryProgress}/{category.items.length} items
                                    </Text>
                                </View>
                                <Ionicons
                                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                                    size={20}
                                    color="#9ca3af"
                                />
                            </TouchableOpacity>

                            {isExpanded && (
                                <View style={styles.itemsList}>
                                    {category.items.map((item) => (
                                        <TouchableOpacity
                                            key={item.id}
                                            style={styles.item}
                                            onPress={() => toggleItem(category.id, item.id)}
                                        >
                                            <View style={[
                                                styles.checkbox,
                                                item.checked && { backgroundColor: '#22c55e', borderColor: '#22c55e' }
                                            ]}>
                                                {item.checked && (
                                                    <Ionicons name="checkmark" size={14} color="#fff" />
                                                )}
                                            </View>
                                            <View style={styles.itemInfo}>
                                                <Text style={[
                                                    styles.itemName,
                                                    item.checked && styles.itemNameChecked
                                                ]}>
                                                    {item.name}
                                                </Text>
                                                {item.quantity > 1 && (
                                                    <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                                                )}
                                            </View>
                                            {item.expirationDate && (
                                                <View style={styles.expirationBadge}>
                                                    <Ionicons name="time" size={10} color="#f97316" />
                                                    <Text style={styles.expirationText}>{item.expirationDate}</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    ))}

                                    {/* Add Item Button */}
                                    <TouchableOpacity style={styles.addItemButton}>
                                        <Ionicons name="add" size={18} color="#3b82f6" />
                                        <Text style={styles.addItemText}>Add Item</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                })}

                {/* Shopping List Button */}
                <TouchableOpacity style={styles.shoppingButton}>
                    <Ionicons name="cart" size={20} color="#fff" />
                    <Text style={styles.shoppingText}>Generate Shopping List</Text>
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
    shareButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
        marginHorizontal: 16,
        padding: 16,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    progressInfo: {},
    progressTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    progressText: {
        color: '#86efac',
        fontSize: 13,
        marginTop: 4,
    },
    progressCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(34, 197, 94, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#22c55e',
    },
    progressPercent: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        marginHorizontal: 16,
        marginTop: 12,
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#22c55e',
        borderRadius: 3,
    },
    list: {
        flex: 1,
        marginTop: 16,
    },
    listContent: {
        padding: 16,
        gap: 12,
    },
    categoryCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    categoryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryInfo: {
        flex: 1,
        marginLeft: 12,
    },
    categoryName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    categoryProgress: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 2,
    },
    itemsList: {
        paddingHorizontal: 14,
        paddingBottom: 14,
        borderTopWidth: 1,
        borderTopColor: AppColors.border,
        paddingTop: 10,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#6b7280',
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemInfo: {
        flex: 1,
        marginLeft: 12,
    },
    itemName: {
        color: '#fff',
        fontSize: 14,
    },
    itemNameChecked: {
        color: '#9ca3af',
        textDecorationLine: 'line-through',
    },
    itemQuantity: {
        color: '#6b7280',
        fontSize: 11,
        marginTop: 2,
    },
    expirationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    expirationText: {
        color: '#f97316',
        fontSize: 10,
    },
    addItemButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#3b82f6',
        borderStyle: 'dashed',
        borderRadius: 8,
    },
    addItemText: {
        color: '#3b82f6',
        fontSize: 13,
        fontWeight: '500',
    },
    shoppingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#f97316',
        padding: 16,
        borderRadius: BorderRadius.lg,
        marginTop: 8,
    },
    shoppingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
