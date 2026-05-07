import { AppColors, BorderRadius } from '@/constants/Colors';
import { EMERGENCY_KIT } from '@/constants/Data';
import { KitCategory } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Modal,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const KIT_STORAGE_KEY = '@guardian_ai_kit_state';

export default function KitScreen() {
    const [categories, setCategories] = useState<KitCategory[]>(EMERGENCY_KIT);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('water');
    const [showShoppingList, setShowShoppingList] = useState(false);

    // Load persisted state on mount
    useEffect(() => {
        loadSavedState();
    }, []);

    const loadSavedState = async () => {
        try {
            const saved = await AsyncStorage.getItem(KIT_STORAGE_KEY);
            if (saved) {
                const savedCategories: KitCategory[] = JSON.parse(saved);
                // Merge saved checked state with current EMERGENCY_KIT
                // (handles new items added to defaults)
                const merged = EMERGENCY_KIT.map(defaultCat => {
                    const savedCat = savedCategories.find(sc => sc.id === defaultCat.id);
                    if (!savedCat) return defaultCat;

                    return {
                        ...defaultCat,
                        items: defaultCat.items.map(defaultItem => {
                            const savedItem = savedCat.items.find(si => si.id === defaultItem.id);
                            return savedItem
                                ? { ...defaultItem, checked: savedItem.checked }
                                : defaultItem;
                        }),
                    };
                });
                setCategories(merged);
            }
        } catch (error) {
            console.error('Failed to load kit state:', error);
        }
    };

    const saveState = async (updatedCategories: KitCategory[]) => {
        try {
            await AsyncStorage.setItem(KIT_STORAGE_KEY, JSON.stringify(updatedCategories));
        } catch (error) {
            console.error('Failed to save kit state:', error);
        }
    };

    const toggleItem = (categoryId: string, itemId: string) => {
        setCategories(prev => {
            const updated = prev.map(cat =>
                cat.id === categoryId
                    ? {
                        ...cat,
                        items: cat.items.map(item =>
                            item.id === itemId ? { ...item, checked: !item.checked } : item
                        )
                    }
                    : cat
            );
            saveState(updated);
            return updated;
        });
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

    const getShoppingList = () => {
        const uncheckedItems: { category: string; name: string; quantity: number }[] = [];
        categories.forEach(cat => {
            cat.items.forEach(item => {
                if (!item.checked) {
                    uncheckedItems.push({
                        category: cat.name,
                        name: item.name,
                        quantity: item.quantity,
                    });
                }
            });
        });
        return uncheckedItems;
    };

    const handleGenerateShoppingList = () => {
        const list = getShoppingList();
        if (list.length === 0) {
            // All items checked — nothing to buy
            setShowShoppingList(false);
            return;
        }
        setShowShoppingList(true);
    };

    const handleShareShoppingList = async () => {
        const list = getShoppingList();
        if (list.length === 0) return;

        let text = '🛒 Emergency Kit Shopping List\n';
        text += '━━━━━━━━━━━━━━━━━━━━━━━\n\n';

        let currentCategory = '';
        list.forEach(item => {
            if (item.category !== currentCategory) {
                currentCategory = item.category;
                text += `📦 ${currentCategory}\n`;
            }
            text += `  ☐ ${item.name}`;
            if (item.quantity > 1) text += ` (Qty: ${item.quantity})`;
            text += '\n';
        });

        text += '\n— Generated by Guardian AI';

        try {
            await Share.share({ message: text });
        } catch (error) {
            console.log('Share cancelled');
        }
    };

    const shoppingList = getShoppingList();

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
                <TouchableOpacity style={styles.shareButton} onPress={handleShareShoppingList}>
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
                <TouchableOpacity style={styles.shoppingButton} onPress={handleGenerateShoppingList}>
                    <Ionicons name="cart" size={20} color="#fff" />
                    <Text style={styles.shoppingText}>Generate Shopping List</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Shopping List Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={showShoppingList}
                onRequestClose={() => setShowShoppingList(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>🛒 Shopping List</Text>
                            <TouchableOpacity onPress={() => setShowShoppingList(false)}>
                                <Ionicons name="close" size={24} color="#9ca3af" />
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.modalSub}>
                            {shoppingList.length} items needed to complete your kit
                        </Text>

                        <ScrollView style={{ maxHeight: 400 }}>
                            {shoppingList.length === 0 ? (
                                <View style={{ alignItems: 'center', padding: 20 }}>
                                    <Ionicons name="checkmark-circle" size={48} color="#22c55e" />
                                    <Text style={{ color: '#22c55e', fontSize: 16, fontWeight: '600', marginTop: 12 }}>
                                        All items ready!
                                    </Text>
                                    <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>
                                        Your emergency kit is 100% complete.
                                    </Text>
                                </View>
                            ) : (
                                (() => {
                                    let currentCat = '';
                                    return shoppingList.map((item, idx) => {
                                        const showHeader = item.category !== currentCat;
                                        if (showHeader) currentCat = item.category;
                                        return (
                                            <View key={idx}>
                                                {showHeader && (
                                                    <Text style={styles.shoppingCatHeader}>{item.category}</Text>
                                                )}
                                                <View style={styles.shoppingItem}>
                                                    <View style={styles.shoppingCheckbox}>
                                                        <Ionicons name="square-outline" size={16} color="#6b7280" />
                                                    </View>
                                                    <Text style={styles.shoppingItemName}>{item.name}</Text>
                                                    {item.quantity > 1 && (
                                                        <Text style={styles.shoppingItemQty}>x{item.quantity}</Text>
                                                    )}
                                                </View>
                                            </View>
                                        );
                                    });
                                })()
                            )}
                        </ScrollView>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setShowShoppingList(false)}>
                                <Text style={styles.modalBtnText}>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtnConfirm, { backgroundColor: '#f97316' }]}
                                onPress={handleShareShoppingList}
                            >
                                <Ionicons name="share-outline" size={16} color="#fff" />
                                <Text style={[styles.modalBtnText, { fontWeight: 'bold' }]}> Share List</Text>
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
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    modalSub: {
        color: '#9ca3af',
        marginBottom: 16,
        fontSize: 13,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
        marginTop: 16,
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
        flexDirection: 'row',
        alignItems: 'center',
    },
    modalBtnText: {
        color: '#fff',
        fontSize: 16,
    },
    shoppingCatHeader: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 6,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    shoppingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    shoppingCheckbox: {
        marginRight: 10,
    },
    shoppingItemName: {
        color: '#e5e7eb',
        fontSize: 14,
        flex: 1,
    },
    shoppingItemQty: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: '500',
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
    },
});
