import { AppColors, BorderRadius } from '@/constants/Colors';
import { MOCK_USER } from '@/constants/Data';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ProfileScreen() {
    const [notifications, setNotifications] = useState(true);
    const [locationSharing, setLocationSharing] = useState(true);
    const [emergencyAlerts, setEmergencyAlerts] = useState(true);

    const SettingRow = ({
        icon,
        label,
        value,
        onPress,
        isSwitch,
        switchValue,
        onSwitchChange,
        danger
    }: {
        icon: string;
        label: string;
        value?: string;
        onPress?: () => void;
        isSwitch?: boolean;
        switchValue?: boolean;
        onSwitchChange?: (value: boolean) => void;
        danger?: boolean;
    }) => (
        <TouchableOpacity
            style={styles.settingRow}
            onPress={onPress}
            disabled={isSwitch}
        >
            <View style={[styles.settingIcon, danger && { backgroundColor: 'rgba(239, 68, 68, 0.2)' }]}>
                <Ionicons name={icon as any} size={20} color={danger ? '#ef4444' : '#9ca3af'} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingLabel, danger && { color: '#ef4444' }]}>{label}</Text>
                {value && <Text style={styles.settingValue}>{value}</Text>}
            </View>
            {isSwitch ? (
                <Switch
                    value={switchValue}
                    onValueChange={onSwitchChange}
                    trackColor={{ false: '#3e3e3e', true: '#3b82f6' }}
                    thumbColor="#fff"
                />
            ) : (
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
            )}
        </TouchableOpacity>
    );

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
                        <Text style={styles.avatarText}>{MOCK_USER.name[0]}</Text>
                    </View>
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>{MOCK_USER.name}</Text>
                        <Text style={styles.userEmail}>{MOCK_USER.email}</Text>
                        <Text style={styles.userPhone}>{MOCK_USER.phone}</Text>
                    </View>
                    <TouchableOpacity style={styles.editButton}>
                        <Ionicons name="pencil" size={18} color="#3b82f6" />
                    </TouchableOpacity>
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statCard}>
                        <Ionicons name="heart" size={20} color="#ef4444" />
                        <Text style={styles.statValue}>{MOCK_USER.bloodType}</Text>
                        <Text style={styles.statLabel}>Blood Type</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={20} color="#3b82f6" />
                        <Text style={styles.statValue}>{MOCK_USER.emergencyContacts.length}</Text>
                        <Text style={styles.statLabel}>Contacts</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="shield-checkmark" size={20} color="#22c55e" />
                        <Text style={styles.statValue}>7/10</Text>
                        <Text style={styles.statLabel}>Prepared</Text>
                    </View>
                </View>

                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActions}>
                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => router.push('/family')}
                        >
                            <View style={[styles.quickActionIcon, { backgroundColor: AppColors.purple.bg }]}>
                                <Ionicons name="people" size={22} color={AppColors.purple.icon} />
                            </View>
                            <Text style={styles.quickActionLabel}>Family</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => router.push('/kit')}
                        >
                            <View style={[styles.quickActionIcon, { backgroundColor: AppColors.amber.bg }]}>
                                <Ionicons name="cube" size={22} color={AppColors.amber.icon} />
                            </View>
                            <Text style={styles.quickActionLabel}>Kit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.quickAction}
                            onPress={() => router.push('/documents')}
                        >
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
                        <SettingRow
                            icon="notifications"
                            label="Push Notifications"
                            isSwitch
                            switchValue={notifications}
                            onSwitchChange={setNotifications}
                        />
                        <SettingRow
                            icon="alert-circle"
                            label="Emergency Alerts"
                            isSwitch
                            switchValue={emergencyAlerts}
                            onSwitchChange={setEmergencyAlerts}
                        />
                    </View>
                </View>

                {/* Privacy Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Privacy</Text>
                    <View style={styles.settingsCard}>
                        <SettingRow
                            icon="location"
                            label="Share Location with Family"
                            isSwitch
                            switchValue={locationSharing}
                            onSwitchChange={setLocationSharing}
                        />
                        <SettingRow
                            icon="eye-off"
                            label="Privacy Settings"
                            onPress={() => { }}
                        />
                    </View>
                </View>

                {/* General Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General</Text>
                    <View style={styles.settingsCard}>
                        <SettingRow
                            icon="help-circle"
                            label="Help & Support"
                            onPress={() => { }}
                        />
                        <SettingRow
                            icon="information-circle"
                            label="About Guardian AI"
                            value="v1.0.0"
                            onPress={() => { }}
                        />
                        <SettingRow
                            icon="log-out"
                            label="Sign Out"
                            danger
                            onPress={() => { }}
                        />
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
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    header: {
        marginBottom: 16,
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
    },
    userCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
    },
    userInfo: {
        flex: 1,
        marginLeft: 16,
    },
    userName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    userEmail: {
        color: '#9ca3af',
        fontSize: 13,
        marginTop: 2,
    },
    userPhone: {
        color: '#9ca3af',
        fontSize: 13,
        marginTop: 2,
    },
    editButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.md,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    statValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 6,
    },
    statLabel: {
        color: '#9ca3af',
        fontSize: 10,
        marginTop: 2,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 10,
        marginLeft: 4,
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    quickAction: {
        alignItems: 'center',
        gap: 8,
    },
    quickActionIcon: {
        width: 50,
        height: 50,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickActionLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '500',
    },
    settingsCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: AppColors.border,
    },
    settingIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    settingContent: {
        flex: 1,
        marginLeft: 12,
    },
    settingLabel: {
        color: '#fff',
        fontSize: 15,
    },
    settingValue: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 2,
    },
});
