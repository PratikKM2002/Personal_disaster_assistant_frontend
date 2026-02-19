import { AppColors, BorderRadius } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import {
    addEmergencyContact,
    deleteEmergencyContact,
    EmergencyContact,
    getProfile,
    updateProfile,
    UserProfile
} from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export default function ProfileScreen() {
    const { user, isAuthenticated, logout } = useAuth();
    const [notifications, setNotifications] = useState(true);
    const [locationSharing, setLocationSharing] = useState(true);
    const [emergencyAlerts, setEmergencyAlerts] = useState(true);

    // Real profile data
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    // Edit profile modal
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editPhone, setEditPhone] = useState('');
    const [editBloodType, setEditBloodType] = useState('');
    const [saving, setSaving] = useState(false);

    // Add contact modal
    const [contactModalVisible, setContactModalVisible] = useState(false);
    const [newContactName, setNewContactName] = useState('');
    const [newContactPhone, setNewContactPhone] = useState('');
    const [newContactRelationship, setNewContactRelationship] = useState('');
    const [newContactPrimary, setNewContactPrimary] = useState(false);

    const fetchProfile = useCallback(async () => {
        try {
            const data = await getProfile();
            setProfile(data);
        } catch (e: any) {
            console.error('Failed to fetch profile:', e.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchProfile();
    }, [isAuthenticated]);

    // Calculate preparedness score
    const getPreparedness = () => {
        if (!profile) return 0;
        let score = 0;
        if (profile.phone) score += 2;
        if (profile.blood_type) score += 2;
        const contacts = profile.contacts || [];
        if (contacts.length > 0) score += 3;
        if (contacts.length >= 2) score += 1;
        if (contacts.some(c => c.is_primary)) score += 1;
        if (notifications) score += 1;
        return Math.min(score, 10);
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        try {
            await updateProfile({ phone: editPhone, blood_type: editBloodType });
            setEditModalVisible(false);
            await fetchProfile();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleAddContact = async () => {
        if (!newContactName.trim() || !newContactPhone.trim()) {
            Alert.alert('Error', 'Name and phone are required');
            return;
        }
        setSaving(true);
        try {
            await addEmergencyContact({
                name: newContactName.trim(),
                phone: newContactPhone.trim(),
                relationship: newContactRelationship.trim() || undefined,
                is_primary: newContactPrimary,
            });
            setContactModalVisible(false);
            setNewContactName('');
            setNewContactPhone('');
            setNewContactRelationship('');
            setNewContactPrimary(false);
            await fetchProfile();
        } catch (e: any) {
            Alert.alert('Error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteContact = async (contact: EmergencyContact) => {
        Alert.alert('Remove Contact', `Remove ${contact.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Remove', style: 'destructive', onPress: async () => {
                    try {
                        await deleteEmergencyContact(contact.id);
                        await fetchProfile();
                    } catch (e: any) {
                        Alert.alert('Error', e.message);
                    }
                }
            },
        ]);
    };

    const openEditModal = () => {
        setEditPhone(profile?.phone || '');
        setEditBloodType(profile?.blood_type || '');
        setEditModalVisible(true);
    };

    const displayName = profile?.name || user?.name || 'User';
    const displayEmail = profile?.email || user?.email || '';
    const prepScore = getPreparedness();

    const handleSignOut = async () => {
        await logout();
        router.replace('/auth');
    };

    const SettingRow = ({
        icon, label, value, onPress, isSwitch, switchValue, onSwitchChange, danger
    }: {
        icon: string; label: string; value?: string; onPress?: () => void;
        isSwitch?: boolean; switchValue?: boolean; onSwitchChange?: (value: boolean) => void; danger?: boolean;
    }) => (
        <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={isSwitch}>
            <View style={[styles.settingIcon, danger && { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Ionicons name={icon as any} size={20} color={danger ? '#ef4444' : '#9ca3af'} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, danger && { color: '#ef4444' }]}>{label}</Text>
                {value && <Text style={styles.settingValue}>{value}</Text>}
            </View>
            {isSwitch ? (
                <Switch value={switchValue} onValueChange={onSwitchChange} trackColor={{ false: '#3e3e3e', true: '#3b82f6' }} thumbColor="#fff" />
            ) : (
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            )}
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color="#3b82f6" />
                    <Text style={{ color: '#6b7280', marginTop: 12 }}>Loading profile...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Profile</Text>
                </View>

                {/* User Info Card */}
                <View style={styles.userCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{displayName[0]}</Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{displayName}</Text>
                        <Text style={styles.userEmail}>{displayEmail}</Text>
                        <Text style={styles.userPhone}>{profile?.phone || 'No phone set'}</Text>
                    </View>
                    <TouchableOpacity style={styles.editButton} onPress={openEditModal}>
                        <Ionicons name="pencil" size={18} color="#3b82f6" />
                    </TouchableOpacity>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="heart" size={20} color="#ef4444" />
                        <Text style={styles.statValue}>{profile?.blood_type || '—'}</Text>
                        <Text style={styles.statLabel}>Blood Type</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={20} color="#3b82f6" />
                        <Text style={styles.statValue}>{(profile?.contacts || []).length}</Text>
                        <Text style={styles.statLabel}>Contacts</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
                        <Text style={styles.statValue}>{prepScore}/10</Text>
                        <Text style={styles.statLabel}>Prepared</Text>
                    </View>
                </View>

                {/* Emergency Contacts */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
                        <TouchableOpacity onPress={() => setContactModalVisible(true)}>
                            <Ionicons name="add-circle" size={24} color="#3b82f6" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.settingsCard}>
                        {(!profile?.contacts || profile.contacts.length === 0) && (
                            <View style={styles.emptyState}>
                                <Ionicons name="people-outline" size={32} color="#4b5563" />
                                <Text style={styles.emptyText}>No emergency contacts yet</Text>
                                <Text style={styles.emptySubtext}>Add someone who should be notified in an emergency</Text>
                            </View>
                        )}
                        {(profile?.contacts || []).map((contact) => (
                            <View key={contact.id} style={styles.contactRow}>
                                <View style={[styles.contactAvatar, contact.is_primary && styles.contactAvatarPrimary]}>
                                    <Text style={styles.contactAvatarText}>{contact.name[0]}</Text>
                                </View>
                                <View style={styles.contactInfo}>
                                    <Text style={styles.contactName}>
                                        {contact.name}
                                        {contact.is_primary && <Text style={styles.primaryBadge}> ★ Primary</Text>}
                                    </Text>
                                    <Text style={styles.contactDetail}>{contact.phone}</Text>
                                    {contact.relationship && (
                                        <Text style={styles.contactRelationship}>{contact.relationship}</Text>
                                    )}
                                </View>
                                <TouchableOpacity onPress={() => handleDeleteContact(contact)} style={styles.deleteBtn}>
                                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/family')}>
                            <View style={[styles.quickActionIcon, { backgroundColor: AppColors.purple.bg }]}>
                                <Ionicons name="people" size={22} color={AppColors.purple.icon} />
                            </View>
                            <Text style={styles.quickActionLabel}>Family</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/kit')}>
                            <View style={[styles.quickActionIcon, { backgroundColor: AppColors.amber.bg }]}>
                                <Ionicons name="cube" size={22} color={AppColors.amber.icon} />
                            </View>
                            <Text style={styles.quickActionLabel}>Kit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickAction} onPress={() => router.push('/documents')}>
                            <View style={[styles.quickActionIcon, { backgroundColor: AppColors.orange.bg }]}>
                                <Ionicons name="document-text" size={22} color={AppColors.orange.icon} />
                            </View>
                            <Text style={styles.quickActionLabel}>Docs</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <View style={styles.settingsCard}>
                        <SettingRow icon="notifications" label="Push Notifications" isSwitch switchValue={notifications} onSwitchChange={setNotifications} />
                        <SettingRow icon="alert-circle" label="Emergency Alerts" isSwitch switchValue={emergencyAlerts} onSwitchChange={setEmergencyAlerts} />
                    </View>
                </View>

                {/* Privacy Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy</Text>
                    <View style={styles.settingsCard}>
                        <SettingRow icon="location" label="Share Location with Family" isSwitch switchValue={locationSharing} onSwitchChange={setLocationSharing} />
                        <SettingRow icon="eye-off" label="Privacy Settings" onPress={() => { }} />
                    </View>
                </View>

                {/* General Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>
                    <View style={styles.settingsCard}>
                        <SettingRow icon="help-circle" label="Help & Support" onPress={() => { }} />
                        <SettingRow icon="information-circle" label="About Guardian AI" value="v1.0.0" onPress={() => { }} />
                        <SettingRow
                            icon="log-out"
                            label={isAuthenticated ? 'Sign Out' : 'Sign In'}
                            danger={isAuthenticated}
                            onPress={isAuthenticated ? handleSignOut : () => router.push('/auth')}
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal visible={editModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <TextInput
                            style={styles.textInput}
                            value={editPhone}
                            onChangeText={setEditPhone}
                            placeholder="Enter phone number"
                            placeholderTextColor="#6b7280"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.inputLabel}>Blood Type</Text>
                        <View style={styles.bloodTypeGrid}>
                            {BLOOD_TYPES.map(bt => (
                                <TouchableOpacity
                                    key={bt}
                                    style={[styles.bloodTypeBtn, editBloodType === bt && styles.bloodTypeBtnActive]}
                                    onPress={() => setEditBloodType(bt)}
                                >
                                    <Text style={[styles.bloodTypeBtnText, editBloodType === bt && styles.bloodTypeBtnTextActive]}>{bt}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Add Contact Modal */}
            <Modal visible={contactModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add Emergency Contact</Text>
                            <TouchableOpacity onPress={() => setContactModalVisible(false)}>
                                <Ionicons name="close" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Name *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={newContactName}
                            onChangeText={setNewContactName}
                            placeholder="Contact name"
                            placeholderTextColor="#6b7280"
                        />

                        <Text style={styles.inputLabel}>Phone *</Text>
                        <TextInput
                            style={styles.textInput}
                            value={newContactPhone}
                            onChangeText={setNewContactPhone}
                            placeholder="Phone number"
                            placeholderTextColor="#6b7280"
                            keyboardType="phone-pad"
                        />

                        <Text style={styles.inputLabel}>Relationship</Text>
                        <TextInput
                            style={styles.textInput}
                            value={newContactRelationship}
                            onChangeText={setNewContactRelationship}
                            placeholder="e.g. Spouse, Parent, Friend"
                            placeholderTextColor="#6b7280"
                        />

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Primary Contact</Text>
                            <Switch
                                value={newContactPrimary}
                                onValueChange={setNewContactPrimary}
                                trackColor={{ false: '#3e3e3e', true: '#3b82f6' }}
                                thumbColor="#fff"
                            />
                        </View>

                        <TouchableOpacity style={styles.saveButton} onPress={handleAddContact} disabled={saving}>
                            {saving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveButtonText}>Add Contact</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: AppColors.background },
    scrollContent: { padding: 16, paddingBottom: 100 },
    header: { marginBottom: 16 },
    title: { color: '#fff', fontSize: 24, fontWeight: '700' },
    userCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: BorderRadius.lg,
        padding: 16, borderWidth: 1, borderColor: AppColors.border,
    },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
    avatarText: { color: '#fff', fontSize: 24, fontWeight: '700' },
    userInfo: { flex: 1, marginLeft: 16 },
    userName: { color: '#fff', fontSize: 18, fontWeight: '600' },
    userEmail: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
    userPhone: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
    editButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59, 130, 246, 0.2)', justifyContent: 'center', alignItems: 'center' },
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
    statCard: {
        flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: BorderRadius.md,
        padding: 14, alignItems: 'center', borderWidth: 1, borderColor: AppColors.border,
    },
    statValue: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: 6 },
    statLabel: { color: '#9ca3af', fontSize: 10, marginTop: 2 },
    section: { marginTop: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 },
    sectionTitle: { color: '#9ca3af', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 10, marginLeft: 4 },
    // Emergency contacts
    contactRow: {
        flexDirection: 'row', alignItems: 'center', padding: 14,
        borderBottomWidth: 1, borderBottomColor: AppColors.border,
    },
    contactAvatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(59,130,246,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    contactAvatarPrimary: { backgroundColor: 'rgba(34,197,94,0.2)' },
    contactAvatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    contactInfo: { flex: 1, marginLeft: 12 },
    contactName: { color: '#fff', fontSize: 15, fontWeight: '500' },
    primaryBadge: { color: '#fbbf24', fontSize: 12, fontWeight: '700' },
    contactDetail: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
    contactRelationship: { color: '#6b7280', fontSize: 11, marginTop: 1 },
    deleteBtn: { padding: 8 },
    emptyState: { padding: 24, alignItems: 'center', gap: 8 },
    emptyText: { color: '#9ca3af', fontSize: 14, fontWeight: '500' },
    emptySubtext: { color: '#6b7280', fontSize: 12, textAlign: 'center' },
    // Quick actions
    quickActions: {
        flexDirection: 'row', justifyContent: 'space-around',
        backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: BorderRadius.lg,
        padding: 16, borderWidth: 1, borderColor: AppColors.border,
    },
    quickAction: { alignItems: 'center', gap: 8 },
    quickActionIcon: { width: 50, height: 50, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    quickActionLabel: { color: '#fff', fontSize: 12, fontWeight: '500' },
    // Settings
    settingsCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: BorderRadius.lg,
        overflow: 'hidden', borderWidth: 1, borderColor: AppColors.border,
    },
    settingRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: AppColors.border },
    settingIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255, 255, 255, 0.1)', justifyContent: 'center', alignItems: 'center' },
    settingContent: { flex: 1, marginLeft: 12 },
    settingLabel: { color: '#fff', fontSize: 15 },
    settingValue: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
    // Modals
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: {
        backgroundColor: '#1e1e2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, maxHeight: '80%',
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
    inputLabel: { color: '#9ca3af', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginTop: 16, marginBottom: 6 },
    textInput: {
        backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14,
        color: '#fff', fontSize: 15, borderWidth: 1, borderColor: AppColors.border,
    },
    bloodTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    bloodTypeBtn: {
        paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: AppColors.border,
    },
    bloodTypeBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
    bloodTypeBtnText: { color: '#9ca3af', fontWeight: '600' },
    bloodTypeBtnTextActive: { color: '#fff' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
    switchLabel: { color: '#fff', fontSize: 15 },
    saveButton: {
        backgroundColor: '#3b82f6', borderRadius: 14, padding: 16,
        alignItems: 'center', marginTop: 24,
    },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
