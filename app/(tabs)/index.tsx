import { AppColors, BorderRadius } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { getOverview, OverviewResponse } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Real-time backend data
  const [hazardCount, setHazardCount] = useState(0);
  const [topHazard, setTopHazard] = useState('');
  const [shelterCount, setShelterCount] = useState(0);
  const [alertBanner, setAlertBanner] = useState('⚠️ CRITICAL: Wildfire - Evacuate Zone B NOW');
  const [alertSubtitle, setAlertSubtitle] = useState('Tap to see all alerts • Last update: 2 minutes ago');

  // Fetch overview data from backend
  useEffect(() => {
    getOverview(37.765, -122.42, 500)
      .then((data: OverviewResponse) => {
        const h = data.hazards || [];
        const s = data.shelters?.items || [];
        setHazardCount(h.length);
        setShelterCount(s.length);
        if (h.length > 0) {
          const top = h[0];
          const mag = top.attributes?.mag || 0;
          const place = top.attributes?.place || 'nearby';
          setAlertBanner(`⚠️ Earthquake M${mag.toFixed(1)} — ${place}`);
          setAlertSubtitle(`${h.length} hazard(s) detected • ${s.length} shelter(s) available`);
          setTopHazard(`M${mag.toFixed(1)} ${place}`);
        }
      })
      .catch(() => { /* keep defaults */ });
  }, []);

  const menuItems = [
    { icon: 'home', label: 'Home', route: '/' },
    { icon: 'map', label: 'Map', route: '/(tabs)/map' },
    { icon: 'alert-circle', label: 'Alerts', route: '/(tabs)/alerts' },
    { icon: 'people', label: 'Community', route: '/(tabs)/community' },
    { icon: 'person', label: 'Profile', route: '/(tabs)/profile' },
    { icon: 'people-outline', label: 'Family Status', route: '/family' },
    { icon: 'cube', label: 'Emergency Kit', route: '/kit' },
    { icon: 'document-text', label: 'Documents', route: '/documents' },
    { icon: 'chatbubble-ellipses', label: 'AI Assistant', route: '/chat' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Status Bar */}
      <View style={styles.statusBar}>
        <Text style={styles.time}>{currentTime}</Text>
        <View style={styles.statusIcons}>
          <Ionicons name="cellular" size={14} color="#fff" />
          <Ionicons name="wifi" size={14} color="#fff" style={{ marginLeft: 4 }} />
          <Ionicons name="battery-full" size={14} color="#fff" style={{ marginLeft: 4 }} />
        </View>
      </View>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            <View style={styles.menuHeader}>
              <View style={styles.menuLogoRow}>
                <Ionicons name="shield-checkmark" size={24} color="#3b82f6" />
                <Text style={styles.menuTitle}>Guardian AI</Text>
              </View>
              <TouchableOpacity onPress={() => setMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.menuScroll}>
              {menuItems.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuVisible(false);
                    router.push(item.route as any);
                  }}
                >
                  <Ionicons name={item.icon as any} size={22} color="#9ca3af" />
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setMenuVisible(true)}
        >
          <Ionicons name="menu" size={22} color="#9ca3af" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.logoRow}>
            <Ionicons name="shield-checkmark" size={18} color="#fff" />
            <Text style={styles.appName}>Guardian AI</Text>
          </View>
          <Text style={styles.location}>San Francisco, CA</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="settings-outline" size={22} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      {/* Scrollable Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Critical Alert Banner */}
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => router.push('/alerts')}
        >
          <Text style={styles.alertTitle}>{alertBanner}</Text>
          <Text style={styles.alertSubtitle}>{alertSubtitle}</Text>
        </TouchableOpacity>

        {/* Weather Widget */}
        <View style={styles.weatherWidget}>
          <View style={styles.weatherMain}>
            <Text style={styles.weatherTemp}>72°F</Text>
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherCondition}>Partly Cloudy</Text>
              <Text style={styles.aqiWarning}>⚠️ AQI 180 - Unhealthy</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.alertsQuickAction}
            onPress={() => router.push('/alerts')}
          >
            <Text style={styles.alertsLabel}>{hazardCount > 0 ? `${hazardCount} Active Hazards` : '3 Active Alerts'}</Text>
            <Text style={styles.alertsList}>{topHazard || 'Wildfire, AQI, Road Closure'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.sosButton}
            onPress={() => Linking.openURL('tel:911')}
          >
            <Text style={styles.sosIcon}>📞</Text>
            <Text style={styles.sosText}>911</Text>
          </TouchableOpacity>
        </View>

        {/* Map Preview */}
        <TouchableOpacity
          style={styles.mapPreview}
          onPress={() => router.push('/(tabs)/map')}
        >
          <View style={styles.mapPlaceholder}>
            <Ionicons name="map" size={40} color="#3b82f6" />
            <Text style={styles.mapText}>Tap to view map</Text>
          </View>
          <View style={styles.mapOverlay}>
            <Text style={styles.mapLabel}>{hazardCount > 0 ? `🔴 ${hazardCount} Active Hazard Zone(s)` : '🔴 Active Hazard Zones'}</Text>
          </View>
        </TouchableOpacity>

        {/* Feature Grid */}
        <View style={styles.featureGrid}>
          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: AppColors.purple.bg }]}
            onPress={() => router.push('/family')}
          >
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.3)' }]}>
              <Ionicons name="people" size={18} color={AppColors.purple.icon} />
            </View>
            <Text style={[styles.featureLabel, { color: AppColors.purple.text }]}>Family</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: AppColors.amber.bg }]}
            onPress={() => router.push('/kit')}
          >
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.3)' }]}>
              <Ionicons name="cube" size={18} color={AppColors.amber.icon} />
            </View>
            <Text style={[styles.featureLabel, { color: AppColors.amber.text }]}>Kit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: AppColors.teal.bg }]}
            onPress={() => router.push('/neighbors')}
          >
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(20, 184, 166, 0.3)' }]}>
              <Ionicons name="heart" size={18} color={AppColors.teal.icon} />
            </View>
            <Text style={[styles.featureLabel, { color: AppColors.teal.text }]}>Neighbors</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.featureCard, { backgroundColor: AppColors.orange.bg }]}
            onPress={() => router.push('/documents')}
          >
            <View style={[styles.featureIconBox, { backgroundColor: 'rgba(249, 115, 22, 0.3)' }]}>
              <Ionicons name="document-text" size={18} color={AppColors.orange.icon} />
            </View>
            <Text style={[styles.featureLabel, { color: AppColors.orange.text }]}>Docs</Text>
          </TouchableOpacity>
        </View>

        {/* Action Plan */}
        <View style={styles.actionPlan}>
          <Text style={styles.sectionTitle}>Action Plan</Text>
          <View style={styles.actionItem}>
            <Text style={styles.actionCheck}>✓</Text>
            <Text style={styles.actionText}><Text style={styles.actionBold}>Evacuate:</Text> Route 1 → Moscone Center</Text>
          </View>
          <View style={styles.actionItem}>
            <Text style={styles.actionCheck}>✓</Text>
            <Text style={styles.actionText}><Text style={styles.actionBold}>Neighbor:</Text> Check on Sarah K. (Apt 18)</Text>
          </View>
          <View style={styles.actionItem}>
            <Text style={styles.actionCheckGray}>○</Text>
            <Text style={styles.actionText}><Text style={styles.actionBold}>Kit:</Text> Water, First Aid, N99 Masks</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: 'rgba(59, 130, 246, 0.5)' }]}>
            <Text style={styles.statValue}>{hazardCount || '0'}</Text>
            <Text style={[styles.statLabel, { color: '#93c5fd' }]}>Hazards</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(249, 115, 22, 0.5)' }]}>
            <Text style={styles.statValue}>{shelterCount || '0'}</Text>
            <Text style={[styles.statLabel, { color: '#fdba74' }]}>Shelters</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: 'rgba(34, 197, 94, 0.5)' }]}>
            <Text style={styles.statValue}>7/10</Text>
            <Text style={[styles.statLabel, { color: '#86efac' }]}>Prepared</Text>
          </View>
        </View>

        {/* Community Updates */}
        <View style={styles.communitySection}>
          <Text style={styles.sectionTitle}>Community Updates</Text>
          <View style={styles.communityCard}>
            <View style={[styles.communityIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
              <Text style={{ color: '#22c55e' }}>✓</Text>
            </View>
            <View style={styles.communityInfo}>
              <Text style={styles.communityText}>12 neighbors marked as safe</Text>
              <Text style={styles.communityTime}>Last check-in: 5 min ago</Text>
            </View>
          </View>
          <View style={styles.communityCard}>
            <View style={[styles.communityIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <Ionicons name="share-social" size={14} color="#3b82f6" />
            </View>
            <View style={styles.communityInfo}>
              <Text style={styles.communityText}>3 resources shared nearby</Text>
              <Text style={styles.communityTime}>Water, Transport, Shelter</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatFab}
        onPress={() => router.push('/chat')}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  time: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  statusIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
  },
  headerCenter: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  location: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
    borderRadius: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 100,
    gap: 10,
  },
  alertBanner: {
    backgroundColor: '#7f1d1d',
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(185, 28, 28, 0.5)',
  },
  alertTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  alertSubtitle: {
    color: 'rgba(254, 202, 202, 0.8)',
    fontSize: 12,
    marginTop: 4,
  },
  weatherWidget: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  weatherTemp: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  weatherInfo: {
    flex: 1,
  },
  weatherCondition: {
    color: '#fff',
    fontSize: 14,
  },
  aqiWarning: {
    color: '#fbbf24',
    fontSize: 12,
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  alertsQuickAction: {
    flex: 1,
    backgroundColor: 'rgba(194, 65, 12, 0.4)',
    borderRadius: BorderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(154, 52, 18, 0.3)',
  },
  alertsLabel: {
    color: '#fb923c',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  alertsList: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 11,
    marginTop: 2,
  },
  sosButton: {
    backgroundColor: '#dc2626',
    borderRadius: BorderRadius.md,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sosIcon: {
    fontSize: 14,
  },
  sosText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  mapPreview: {
    height: 180,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#1a1a2e',
    overflow: 'hidden',
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
  },
  mapLabel: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
  },
  featureGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  featureCard: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    padding: 12,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  featureIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureLabel: {
    fontSize: 9,
    fontWeight: '500',
  },
  actionPlan: {
    backgroundColor: '#fff',
    borderRadius: BorderRadius.lg,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  actionCheck: {
    color: '#16a34a',
    fontSize: 14,
  },
  actionCheckGray: {
    color: '#9ca3af',
    fontSize: 14,
  },
  actionText: {
    color: '#1f2937',
    fontSize: 12,
  },
  actionBold: {
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: BorderRadius.md,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 8,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  communitySection: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: AppColors.border,
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BorderRadius.md,
    padding: 8,
    marginBottom: 8,
  },
  communityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  communityInfo: {
    flex: 1,
  },
  communityText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  communityTime: {
    color: '#6b7280',
    fontSize: 10,
    marginTop: 2,
  },
  chatFab: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Menu Modal Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  menuContainer: {
    width: '80%',
    height: '100%',
    backgroundColor: AppColors.background,
    paddingTop: 60,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  menuLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  menuScroll: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  menuItemText: {
    color: '#fff',
    fontSize: 16,
  },
});
