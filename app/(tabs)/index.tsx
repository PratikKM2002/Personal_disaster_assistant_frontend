import SafetyStatusBar from '@/components/SafetyStatusBar';
import { AppColors, BorderRadius } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { getFloodRisk, getOverview, WeatherData } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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

// AQI Helpers
function getAqiLabel(aqi: number) {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Sensitive';
  if (aqi <= 200) return 'Unhealthy';
  return 'Hazardous';
}

function getAqiColor(aqi: number) {
  if (aqi <= 50) return '#22c55e';
  if (aqi <= 100) return '#fbbf24';
  if (aqi <= 150) return '#f97316';
  return '#ef4444';
}

function getWeatherIcon(code: number) {
  if (code === 0) return 'sunny';
  if (code <= 3) return 'cloudy';
  if (code <= 48) return 'reorder-three'; // Fog
  if (code <= 67) return 'rainy';
  return 'cloud';
}

function getWeatherLabel(code: number) {
  if (code === 0) return 'Clear Sky';
  if (code <= 3) return 'Partly Cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rainy';
  return 'Overcast';
}

export default function HomeScreen() {
  const { isAuthenticated } = useAuth();
  const [menuVisible, setMenuVisible] = useState(false);
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Real-time backend data
  const [hazardCount, setHazardCount] = useState(0);
  const [hazards, setHazards] = useState<any[]>([]);
  const [shelterCount, setShelterCount] = useState(0);
  const [weather, setWeather] = useState<WeatherData | undefined>(undefined);
  const [weatherModalVisible, setWeatherModalVisible] = useState(false);
  const [hazardModalVisible, setHazardModalVisible] = useState(false);
  const [selectedHazard, setSelectedHazard] = useState<any>(null);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number }>({ lat: 37.765, lng: -122.42 });
  const [locationName, setLocationName] = useState('Locating...');
  const [floodRisk, setFloodRisk] = useState<any>(null);

  const getDist = (h: any) => {
    if (!h) return 1000;
    const hLat = h.location?.lat ?? h.lat;
    const hLon = h.location?.lng ?? h.lon;
    if (hLat === undefined || hLon === undefined) return 1000;
    const phi1 = currentUserLocation.lat * Math.PI / 180;
    const phi2 = hLat * Math.PI / 180;
    const dPhi = (hLat - currentUserLocation.lat) * Math.PI / 180;
    const dLon = (hLon - currentUserLocation.lng) * Math.PI / 180;
    const a = Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    (async () => {
      let lat = 37.765;
      let lon = -122.42;
      let locName = 'Locating...';
      let gotLocation = false;

      // Try expo-location first (works on mobile)
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Promise.race([
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 10000))
          ]);

          lat = location.coords.latitude;
          lon = location.coords.longitude;
          gotLocation = true;
        }
      } catch (e: any) {
        console.log('Expo location error, trying browser fallback:', e.message);
      }

      // Fallback: browser navigator.geolocation (better on web)
      if (!gotLocation && typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000,
            });
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          gotLocation = true;
        } catch (e: any) {
          console.log('Browser geolocation error:', e.message);
        }
      }

      setCurrentUserLocation({ lat, lng: lon });

      // Reverse geocode for display name
      try {
        const address = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
        if (address && address.length > 0) {
          const { city, region, isoCountryCode } = address[0];
          locName = city ? `${city}, ${region || isoCountryCode}` : '';
        }
      } catch {
        // expo geocoder failed (common on web)
      }

      // Fallback: use Nominatim (OpenStreetMap) for web reverse geocoding
      if (!locName || locName === 'Locating...') {
        try {
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
            { headers: { 'User-Agent': 'DisasterAssistantApp/1.0' } }
          );
          const geoData = await geoRes.json();
          const city = geoData.address?.city || geoData.address?.town || geoData.address?.suburb || '';
          const state = geoData.address?.state || '';
          locName = city ? `${city}, ${state}` : (gotLocation ? 'Current Location' : 'Unknown Location');
        } catch {
          locName = gotLocation ? 'Current Location' : 'Unknown Location';
        }
      }

      setLocationName(locName);

      // Fetch overview and flood risk in parallel
      try {
        const [overviewData, floodData] = await Promise.all([
          getOverview(lat, lon, 50),
          getFloodRisk(lat, lon)
        ]);

        const h = overviewData.hazards || [];
        setHazardCount(h.length);
        setHazards(h);
        setShelterCount(overviewData.shelters?.items?.length || 0);
        setFloodRisk(floodData);

        if (overviewData.stats) setStats(overviewData.stats);
        if (overviewData.weather) setWeather(overviewData.weather);
      } catch (err) {
        console.log('Data fetch failed', err);
      }
    })();
  }, []);

  const [stats, setStats] = useState({
    neighbors_safe: 0,
    resources_nearby: 0,
    family_safe: 0,
    family_total: 0,
    preparedness_score: 0
  });

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
      {/* ... (Status Bar & Menu same) ... */}
      <View style={styles.statusBar}>
        <Text style={styles.time}>{currentTime}</Text>
        <View style={styles.statusIcons}>
          <Ionicons name="cellular" size={14} color="#fff" />
          <Ionicons name="wifi" size={14} color="#fff" style={{ marginLeft: 4 }} />
          <Ionicons name="battery-full" size={14} color="#fff" style={{ marginLeft: 4 }} />
        </View>
      </View>

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
                    // @ts-ignore
                    router.push(item.route);
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
          <Text style={styles.location}>{locationName}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/(tabs)/profile')}
        >
          <Ionicons name="settings-outline" size={22} color="#9ca3af" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Hazard Status Bar */}
        <SafetyStatusBar
          hazards={hazards}
          userLocation={currentUserLocation}
          onPress={() => {
            if (hazards.length > 0) {
              const nearest = hazards.reduce((prev, curr) => getDist(curr) < getDist(prev) ? curr : prev);
              setSelectedHazard(nearest);
              setHazardModalVisible(true);
            }
          }}
        />


        {/* Weather Widget */}
        <TouchableOpacity
          style={styles.weatherWidget}
          onPress={() => weather && setWeatherModalVisible(true)}
          activeOpacity={weather ? 0.7 : 1}
        >
          <View style={styles.weatherMain}>
            <View style={styles.weatherIconContainer}>
              <Ionicons
                name={weather ? getWeatherIcon(weather.condition_code) : 'cloud-outline'}
                size={32}
                color="#fff"
              />
            </View>
            <View style={styles.weatherInfo}>
              <Text style={styles.weatherTemp}>
                {weather ? `${Math.round(weather.temp)}°${weather.params.temp_unit}` : '--'}
              </Text>
              <Text style={styles.weatherCondition}>
                {weather ? getWeatherLabel(weather.condition_code) : 'Loading Weather...'}
              </Text>
              {weather && (
                <Text style={[styles.aqiWarning, { color: getAqiColor(weather.aqi) }]}>
                  AQI {weather.aqi} - {getAqiLabel(weather.aqi)}
                </Text>
              )}
            </View>
            {weather && <Ionicons name="chevron-forward" size={20} color="#6b7280" />}
          </View>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.alertsQuickAction}
            onPress={() => {
              if (hazards.length > 0) {
                const nearest = hazards.reduce((prev, curr) => getDist(curr) < getDist(prev) ? curr : prev);
                setSelectedHazard(nearest);
                setHazardModalVisible(true);
              } else {
                router.push('/alerts');
              }
            }}
          >
            <Text style={styles.alertsLabel}>{hazards.length > 0 ? `${hazards.length} Active Hazards` : 'No Active Hazards'}</Text>
            <Text style={styles.alertsList}>{hazards.length === 0 ? 'Monitoring...' : 'Tap for details'}</Text>
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
            <Text style={styles.mapLabel}>{hazardCount > 0 ? `🔴 ${hazardCount} Hazard Zones` : '✅ Area Clear'}</Text>
          </View>
        </TouchableOpacity>

        {/* Feature Grid - all clickable */}
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

        {/* Dynamic Action Plan */}
        <View style={styles.actionPlan}>
          <Text style={styles.sectionTitle}>Action Plan</Text>

          {hazards.length > 0 ? (
            <>
              <TouchableOpacity style={styles.actionItem} onPress={() => {
                const nearest = hazards.reduce((prev, curr) => getDist(curr) < getDist(prev) ? curr : prev);
                const d = getDist(nearest);
                if (nearest && d < 10) {
                  router.push('/(tabs)/map');
                } else {
                  setSelectedHazard(nearest);
                  setHazardModalVisible(true);
                }
              }}>
                <Text style={styles.actionCheck}>⚠️</Text>
                <Text style={styles.actionText}><Text style={styles.actionBold}>Monitor:</Text> Check nearest hazard details</Text>
                <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/family')}>
                <Text style={styles.actionCheck}>○</Text>
                <Text style={styles.actionText}><Text style={styles.actionBold}>Family:</Text> Check status ({stats.family_safe}/{stats.family_total} safe)</Text>
                <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/documents')}>
                <Text style={styles.actionCheck}>✓</Text>
                <Text style={styles.actionText}><Text style={styles.actionBold}>Plan:</Text> Review emergency docs</Text>
                <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/kit')}>
                <Text style={styles.actionCheckGray}>○</Text>
                <Text style={styles.actionText}><Text style={styles.actionBold}>Kit:</Text> Audit supplies (Preparedness: {stats.preparedness_score}/10)</Text>
                <Ionicons name="chevron-forward" size={16} color="#666" style={{ marginLeft: 'auto' }} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats - Clickable */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: 'rgba(59, 130, 246, 0.5)' }]}
            onPress={() => router.push('/alerts')}
          >
            <Text style={styles.statValue}>{hazardCount}</Text>
            <Text style={[styles.statLabel, { color: '#93c5fd' }]}>Hazards</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: 'rgba(249, 115, 22, 0.5)' }]}
            onPress={() => router.push('/(tabs)/map')}
          >
            <Text style={styles.statValue}>{shelterCount}</Text>
            <Text style={[styles.statLabel, { color: '#fdba74' }]}>Shelters</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, { backgroundColor: 'rgba(34, 197, 94, 0.5)' }]}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.statValue}>{stats.preparedness_score}<Text style={{ fontSize: 14 }}>/10</Text></Text>
            <Text style={[styles.statLabel, { color: '#86efac' }]}>Prepared</Text>
          </TouchableOpacity>
        </View>

        {/* Community Updates - Dynamic */}
        <View style={styles.communitySection}>
          <Text style={styles.sectionTitle}>Community Updates</Text>

          <TouchableOpacity style={styles.communityCard} onPress={() => router.push('/neighbors')}>
            <View style={[styles.communityIcon, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
              <Text style={{ color: '#22c55e' }}>✓</Text>
            </View>
            <View style={styles.communityInfo}>
              <Text style={styles.communityText}>{stats.neighbors_safe} neighbors marked as safe</Text>
              <Text style={styles.communityTime}>Tap to view community</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.communityCard} onPress={() => router.push('/community')}>
            <View style={[styles.communityIcon, { backgroundColor: 'rgba(59, 130, 246, 0.2)' }]}>
              <Ionicons name="share-social" size={14} color="#3b82f6" />
            </View>
            <View style={styles.communityInfo}>
              <Text style={styles.communityText}>{stats.resources_nearby} resources shared nearby</Text>
              <Text style={styles.communityTime}>Water, Transport, Shelter</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.chatFab}
        onPress={() => router.push('/chat')}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Hazard Details Modal */}
      <Modal
        visible={hazardModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setHazardModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.hazardModalContent, { borderTopColor: selectedHazard?.severity >= 0.7 ? '#ef4444' : '#eab308' }]}>
            <View style={styles.modalHeader}>
              <View style={styles.hazardTitleRow}>
                <Ionicons
                  name={selectedHazard?.type === 'flood' ? 'water' : 'warning'}
                  size={24}
                  color={selectedHazard?.severity >= 0.7 ? '#ef4444' : '#eab308'}
                />
                <Text style={styles.hazardModalTitle}>
                  {selectedHazard?.type ? `${selectedHazard.type.charAt(0).toUpperCase() + selectedHazard.type.slice(1)} Alert` : 'Hazard Alert'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setHazardModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {selectedHazard && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.hazardSubtitle}>
                  {getDist(selectedHazard).toFixed(1)}km from your location
                </Text>

                <View style={styles.hazardDetailsCard}>
                  <Text style={styles.hazardDescription}>
                    {selectedHazard.attributes?.description || selectedHazard.message || "Hazard monitoring in progress."}
                  </Text>

                  {selectedHazard.type === 'flood' && selectedHazard.attributes?.ratio && (
                    <View style={styles.floodMetricContainer}>
                      <Text style={styles.floodMetricLabel}>River Discharge Ratio</Text>
                      <Text style={[styles.floodMetricValue, { color: selectedHazard.severity >= 0.7 ? '#ef4444' : '#eab308' }]}>
                        {selectedHazard.attributes.ratio}x Normal
                      </Text>
                    </View>
                  )}
                </View>

                <View style={[styles.adviceBox, { borderColor: selectedHazard.severity >= 0.7 ? '#ef4444' : '#eab308' }]}>
                  <Text style={[styles.adviceTitle, { color: selectedHazard.severity >= 0.7 ? '#ef4444' : '#eab308' }]}>
                    Safety Recommendation
                  </Text>
                  <Text style={styles.adviceText}>
                    {selectedHazard.severity >= 0.7
                      ? "CRITICAL: Heavy rainfall and high river discharge. Evacuate low-lying areas and avoid river banks immediately."
                      : "ADVISORY: Expect urban ponding and heavy rain. Drive carefully and monitor local news for updates."}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: '#3b82f6' }]}
                  onPress={() => {
                    setHazardModalVisible(false);
                    router.push({
                      pathname: '/(tabs)/map',
                      params: { lat: selectedHazard.lat, lng: selectedHazard.lon }
                    });
                  }}
                >
                  <Ionicons name="map" size={18} color="#fff" />
                  <Text style={styles.modalActionBtnText}>View on Map</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalActionBtn, { backgroundColor: 'rgba(255, 255, 255, 0.1)', marginTop: 8 }]}
                  onPress={() => setHazardModalVisible(false)}
                >
                  <Text style={styles.modalActionBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      <Modal
        visible={weatherModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWeatherModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.weatherModalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalHeaderTitle}>Climate Forecast</Text>
                <Text style={styles.modalHeaderSubtitle}>{locationName}</Text>
              </View>
              <TouchableOpacity onPress={() => setWeatherModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {weather && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Current Weather Detailed Card */}
                <View style={styles.currentWeatherCard}>
                  <View style={styles.currentWeatherMain}>
                    <Ionicons name={getWeatherIcon(weather.condition_code)} size={64} color="#fff" />
                    <View>
                      <Text style={styles.currentWeatherTemp}>{Math.round(weather.temp)}°{weather.params.temp_unit}</Text>
                      <Text style={styles.currentWeatherDesc}>{getWeatherLabel(weather.condition_code)}</Text>
                    </View>
                  </View>
                  <View style={styles.weatherStatsRow}>
                    <View style={styles.weatherStatItem}>
                      <Text style={styles.weatherStatLabel}>AQI</Text>
                      <Text style={[styles.weatherStatValue, { color: getAqiColor(weather.aqi) }]}>{weather.aqi}</Text>
                    </View>
                    <View style={styles.weatherStatDivider} />
                    <View style={styles.weatherStatItem}>
                      <Text style={styles.weatherStatLabel}>Condition</Text>
                      <Text style={styles.weatherStatValue}>{getAqiLabel(weather.aqi)}</Text>
                    </View>
                  </View>
                </View>

                {/* 7-Day Forecast */}
                <Text style={styles.forecastTitle}>7-Day Forecast</Text>
                <View style={styles.forecastList}>
                  {weather.forecast.map((day, idx) => (
                    <View key={idx} style={styles.forecastItem}>
                      <Text style={styles.forecastDate}>
                        {idx === 0 ? 'Today' : new Date(day.date).toLocaleDateString([], { weekday: 'short' })}
                      </Text>
                      <Ionicons name={getWeatherIcon(day.code)} size={24} color="#fff" style={styles.forecastIcon} />
                      <View style={styles.forecastRain}>
                        {day.rain_prob > 0 && (
                          <>
                            <Ionicons name="water" size={10} color="#60a5fa" />
                            <Text style={styles.forecastRainText}>{day.rain_prob}%</Text>
                          </>
                        )}
                      </View>
                      <View style={styles.forecastTemps}>
                        <Text style={styles.forecastTempMax}>{Math.round(day.max_temp)}°</Text>
                        <Text style={styles.forecastTempMin}>{Math.round(day.min_temp)}°</Text>
                      </View>
                    </View>
                  ))}
                </View>

                <View style={styles.weatherFooter}>
                  <Text style={styles.weatherFooterText}>Data provided by Open-Meteo</Text>
                </View>
              </ScrollView>
            )}
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
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
  },
  // Menu Modal Styles
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
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
  // Weather Modal Styles
  weatherModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    boxShadow: '0px 10px 25px rgba(0, 0, 0, 0.5)',
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalHeaderTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalHeaderSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderRadius: 12,
  },
  currentWeatherCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  currentWeatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 20,
  },
  currentWeatherTemp: {
    color: '#fff',
    fontSize: 48,
    fontWeight: '800',
  },
  currentWeatherDesc: {
    color: '#94a3b8',
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  weatherStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 15,
  },
  weatherStatItem: {
    alignItems: 'center',
  },
  weatherStatLabel: {
    color: '#64748b',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  weatherStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  weatherStatDivider: {
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  forecastTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  forecastList: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    padding: 10,
  },
  forecastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  forecastDate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    width: 50,
  },
  forecastIcon: {
    marginHorizontal: 15,
  },
  forecastRain: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 45,
    gap: 2,
  },
  forecastRainText: {
    color: '#60a5fa',
    fontSize: 12,
    fontWeight: '600',
  },
  forecastTemps: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 15,
  },
  forecastTempMax: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    width: 30,
    textAlign: 'right',
  },
  forecastTempMin: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '500',
    width: 30,
    textAlign: 'right',
  },
  weatherFooter: {
    marginTop: 20,
    alignItems: 'center',
  },
  weatherFooterText: {
    color: '#475569',
    fontSize: 12,
  },
  // New weather styles for home widget
  weatherIconContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Hazard Modal Styles
  hazardModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#111827',
    borderRadius: 24,
    padding: 24,
    borderTopWidth: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
  },
  hazardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hazardModalTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
  },
  hazardSubtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  hazardDetailsCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  hazardDescription: {
    color: '#e5e7eb',
    fontSize: 15,
    lineHeight: 22,
  },
  floodMetricContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floodMetricLabel: {
    color: '#9ca3af',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  floodMetricValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  adviceBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  adviceTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  adviceText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  modalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
  },
  modalActionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
