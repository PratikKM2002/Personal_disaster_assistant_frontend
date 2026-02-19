import NativeMap from '@/components/NativeMap';
import SafetyStatusBar from '@/components/SafetyStatusBar';
import { AppColors, BorderRadius } from '@/constants/Colors';
import { MOCK_USER_LOCATION } from '@/constants/Data';
import { BackendHazard, BackendShelter, getFamilyMembers, getOverview } from '@/services/api';
import { Hazard, Resource } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');

type CategoryType = 'all' | 'medical' | 'shelter' | 'emergency' | 'supplies';

const CATEGORIES = [
    { id: 'all', label: 'All', icon: 'apps' },
    { id: 'medical', label: 'Medical', icon: 'medical' },
    { id: 'shelter', label: 'Shelters', icon: 'home' },
    { id: 'emergency', label: 'Emergency', icon: 'alert-circle' },
    { id: 'supplies', label: 'Supplies', icon: 'cube' },
];

const CATEGORY_COLORS: Record<string, string> = {
    medical: '#ef4444',
    shelter: '#3b82f6',
    emergency: '#f97316',
    supplies: '#8b5cf6',
};

export default function MapScreen() {
    const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');
    const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);
    const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
    const [familyMembers, setFamilyMembers] = useState<any[]>([]);
    const [hazards, setHazards] = useState<Hazard[]>([]);
    const [backendResources, setBackendResources] = useState<Resource[]>([]);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Handle navigation params (e.g. from Alerts)
    const params = useLocalSearchParams<{ lat: string; lng: string; hazardTitle: string }>();
    const [focusLocation, setFocusLocation] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (params.lat && params.lng) {
            const lat = Number(params.lat);
            const lng = Number(params.lng);
            if (!isNaN(lat) && !isNaN(lng)) {
                setFocusLocation({ lat, lng });
            }
        }
    }, [params.lat, params.lng]);

    // Request location permission and start tracking
    useEffect(() => {
        let locationSubscription: Location.LocationSubscription | null = null;

        const startLocationTracking = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();

                if (status !== 'granted') {
                    setLocationPermission(false);
                    if (Platform.OS !== 'web') {
                        Alert.alert(
                            'Location Permission',
                            'Location access was denied. Showing available data. You can enable it in Settings.',
                            [{ text: 'OK' }]
                        );
                    }
                    // Fallback to a default location if needed, or just don't fetch location-based data
                    // For now, let's just default to SF if denied so the map isn't blank
                    setUserLocation({
                        latitude: MOCK_USER_LOCATION.lat,
                        longitude: MOCK_USER_LOCATION.lng,
                        altitude: 0,
                        accuracy: 0,
                        altitudeAccuracy: 0,
                        heading: 0,
                        speed: 0
                    });
                    return;
                }

                setLocationPermission(true);

                // Get initial location
                const currentLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                setUserLocation(currentLocation.coords);

                // Start watching position for real-time updates
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 5000,      // Update every 5 seconds
                        distanceInterval: 10,     // Or when moved 10 meters
                    },
                    (newLocation) => {
                        setUserLocation(newLocation.coords);
                    }
                );
            } catch (error) {
                console.error('Location error:', error);
                setLocationPermission(false);
            }
        };

        startLocationTracking();

        // Cleanup subscription on unmount
        return () => {
            try {
                if (locationSubscription) {
                    locationSubscription.remove();
                }
            } catch (e) {
                // Ignore cleanup errors on web (known Expo issue)
            }
        };
    }, []);

    // Poll for Family Members & Environment Data
    useEffect(() => {
        const fetchData = async () => {
            if (!userLocation) return;

            try {
                // 1. Fetch Family Members
                try {
                    const familyData = await getFamilyMembers();
                    const members = familyData.members.map(m => ({
                        id: String(m.id),
                        name: m.name,
                        status: m.safety_status || 'unknown',
                        location: 'Unknown', // You could reverse geocode here if you had a helper
                        lastUpdate: m.last_location_update ? new Date(m.last_location_update).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Unknown',
                        coordinates: (m.last_lat && m.last_lon) ? [m.last_lon, m.last_lat] : undefined
                    }));
                    setFamilyMembers(members as any);
                } catch (e) {
                    console.log('Family fetch failed (maybe not logged in):', e);
                }

                // 2. Fetch Overview (Hazards + Shelters)
                const overview = await getOverview(userLocation.latitude, userLocation.longitude, 10);

                // Process Hazards
                if (overview.hazards && overview.hazards.length > 0) {
                    const mappedHazards: Hazard[] = overview.hazards.map((h: BackendHazard) => {
                        const mag = h.attributes?.mag;
                        const sevNum = Number(h.severity);
                        let severity: Hazard['severity'] = 'moderate';
                        if (sevNum >= 0.7) severity = 'critical';
                        else if (sevNum >= 0.4) severity = 'high';

                        const type = (h.type || 'hazard').toLowerCase() as Hazard['type'];
                        let title = h.attributes?.title || `${type.charAt(0).toUpperCase() + type.slice(1)}`;

                        if (type === 'earthquake' && mag) {
                            title = `Earthquake M${mag.toFixed(1)}`;
                        }

                        const place = h.attributes?.place || `${h.dist_km?.toFixed(0)}km away`;

                        return {
                            id: `bh-${h.id}`,
                            type: type,
                            title: `${title} — ${place}`,
                            severity,
                            zone: `${h.dist_km?.toFixed(0)}km`,
                            location: { lat: h.lat, lng: h.lon },
                            description: h.message || h.attributes?.description || `${title} detected at ${place}. Source: ${h.source}.`,
                            action: severity === 'critical' ? 'Evacuate area immediately' : 'Stay alert and follow local news',
                            evacuationRoute: [],
                            shelters: [],
                        };
                    });
                    setHazards(mappedHazards);
                } else {
                    setHazards([]);
                }

                // Process Shelters (Resources)
                if (overview.shelters?.items && overview.shelters.items.length > 0) {
                    const mappedShelters: Resource[] = overview.shelters.items.map((s: BackendShelter) => {
                        let category: 'medical' | 'shelter' | 'emergency' | 'supplies' = 'shelter';
                        let typeDisplay = 'Emergency Shelter';

                        const rawType = s.type?.toLowerCase() || 'shelter';

                        if (rawType === 'hospital' || rawType === 'clinic') {
                            category = 'medical';
                            typeDisplay = rawType.charAt(0).toUpperCase() + rawType.slice(1);
                        } else if (rawType === 'fire_station' || rawType === 'police' || rawType === 'ambulance') {
                            category = 'emergency';
                            typeDisplay = rawType === 'fire_station' ? 'Fire Station' : rawType.charAt(0).toUpperCase() + rawType.slice(1);
                        } else if (rawType === 'supply' || rawType === 'pharmacy' || rawType === 'supermarket') {
                            category = 'supplies';
                            typeDisplay = rawType === 'supply' ? 'Supplies' : rawType.charAt(0).toUpperCase() + rawType.slice(1);
                        } else {
                            // Default to shelter
                            category = 'shelter';
                            typeDisplay = 'Emergency Shelter';
                        }

                        return {
                            id: `bs-${s.id}`,
                            name: s.name,
                            type: typeDisplay,
                            category: category,
                            distance: s.dist_km != null ? `${s.dist_km.toFixed(1)} km` : 'N/A',
                            address: s.address || 'Address not available',
                            phone: s.phone || undefined,
                            hours: 'Open 24/7',
                            status: (s.status === 'open' ? 'open' : s.status === 'closed' ? 'closed' : 'limited') as Resource['status'],
                            capacity: s.capacity ? `${s.capacity} Beds` : undefined,
                            icon: category === 'medical' ? '🏥' :
                                category === 'emergency' ? '🚒' :
                                    category === 'supplies' ? '📦' : '🏠',
                            coordinates: [s.lon, s.lat] as [number, number],
                            inHazardZone: false,
                        };
                    });
                    setBackendResources(mappedShelters);
                } else {
                    setBackendResources([]);
                }

                setDataLoaded(true);

            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            }
        };

        // Initial fetch
        fetchData();

        // Polling interval (15 seconds for family updates)
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);

    }, [userLocation]);

    const filteredResources = backendResources.filter(
        r => selectedCategory === 'all' || r.category === selectedCategory
    );

    const getIconForResource = (type: string) => {
        switch (type) {
            case 'hospital': return 'medkit';
            case 'fire_station': return 'flame';
            case 'shelter': return 'home';
            default: return 'location'; // default fallback
        }
    };
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return '#22c55e';
            case 'limited': return '#eab308';
            case 'closed': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const handleNavigate = (resource: Resource) => {
        router.push({
            pathname: '/navigation',
            params: {
                destLat: resource.coordinates[1].toString(),
                destLon: resource.coordinates[0].toString(),
                destName: resource.name,
            }
        });
    };

    const findNearestHazard = () => {
        if (hazards.length === 0) {
            Alert.alert('Safe!', 'No active hazards detected in your vicinity.');
            return;
        }

        // Hazards from backend already have dist_km if calculated there, 
        // but we can also just find the min of what we have.
        const nearest = hazards.reduce((prev, curr) => {
            // Some hazards might not have dist_km if mock or special case, so we fallback
            const distA = prev.location.lat && userLocation ?
                Math.sqrt(Math.pow(prev.location.lat - userLocation.latitude, 2) + Math.pow(prev.location.lng - userLocation.longitude, 2)) : 1000;
            const distB = curr.location.lat && userLocation ?
                Math.sqrt(Math.pow(curr.location.lat - userLocation.latitude, 2) + Math.pow(curr.location.lng - userLocation.longitude, 2)) : 1000;
            return distA < distB ? prev : curr;
        });

        if (nearest && nearest.location) {
            setFocusLocation({ lat: nearest.location.lat, lng: nearest.location.lng });
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header - Hidden in Full Screen */}
            {!isFullScreen && (
                <View style={styles.header}>
                    <Text style={styles.title}>Nearby Resources</Text>
                    <Text style={styles.subtitle}>
                        {locationPermission === true
                            ? '📍 Live location active'
                            : locationPermission === false
                                ? '📍 Using default location'
                                : '📍 Getting your location...'}
                    </Text>
                </View>
            )}

            {/* Map */}
            <View style={[
                styles.mapContainer,
                isFullScreen && styles.mapContainerFullScreen
            ]}>
                <NativeMap
                    userLocation={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : MOCK_USER_LOCATION}
                    resources={filteredResources}
                    categoryColors={CATEGORY_COLORS}
                    hazards={hazards}
                    familyMembers={familyMembers}
                    isLiveLocation={locationPermission === true}
                    focusLocation={focusLocation}
                />

                {/* Overlaid Status Bar */}
                <View style={styles.statusOverlay}>
                    <SafetyStatusBar
                        hazards={hazards}
                        userLocation={userLocation ? { lat: userLocation.latitude, lng: userLocation.longitude } : { lat: MOCK_USER_LOCATION.lat, lng: MOCK_USER_LOCATION.lng }}
                    />
                </View>

                {/* Float Actions */}
                <View style={styles.mapFloatActions}>
                    <TouchableOpacity
                        style={[styles.mapActionButton, { backgroundColor: '#ef4444' }]}
                        onPress={findNearestHazard}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="warning" size={20} color="white" />
                        {!isFullScreen && <Text style={styles.mapActionText}>Focus Danger</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.mapActionButton, { backgroundColor: '#3b82f6' }]}
                        onPress={() => setIsFullScreen(!isFullScreen)}
                        activeOpacity={0.8}
                    >
                        <Ionicons name={isFullScreen ? "contract" : "expand"} size={20} color="white" />
                        {!isFullScreen && <Text style={styles.mapActionText}>Full Screen</Text>}
                    </TouchableOpacity>
                </View>

                {/* Hazard Zone Legend */}
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
                        <Text style={styles.legendText}>Active Hazard</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#22c55e' }]} />
                        <Text style={styles.legendText}>Safe Zone</Text>
                    </View>
                </View>
            </View>

            {/* Category Filter - Hidden in Full Screen */}
            {!isFullScreen && (
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
                            onPress={() => setSelectedCategory(cat.id as CategoryType)}
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
            )}

            {/* Resource List - Hidden in Full Screen */}
            {!isFullScreen && (
                <ScrollView
                    style={styles.resourceList}
                    contentContainerStyle={styles.resourceListContent}
                >
                    {filteredResources.map((resource) => (
                        <View key={resource.id} style={styles.resourceCard}>
                            {resource.inHazardZone && (
                                <View style={styles.hazardWarning}>
                                    <Ionicons name="warning" size={12} color="#fbbf24" />
                                    <Text style={styles.hazardText}>{resource.hazardWarning || 'In hazard zone'}</Text>
                                </View>
                            )}

                            <View style={styles.resourceHeader}>
                                <View style={styles.resourceIcon}>
                                    <Text style={{ fontSize: 24 }}>{resource.icon}</Text>
                                </View>
                                <View style={styles.resourceInfo}>
                                    <Text style={styles.resourceName}>{resource.name}</Text>
                                    <Text style={styles.resourceType}>{resource.type}</Text>
                                    <View style={styles.resourceMeta}>
                                        <Text style={styles.resourceDistance}>{resource.distance}</Text>
                                        <View style={[styles.statusDot, { backgroundColor: getStatusColor(resource.status) }]} />
                                        <Text style={[styles.resourceStatus, { color: getStatusColor(resource.status) }]}>
                                            {resource.status.charAt(0).toUpperCase() + resource.status.slice(1)}
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.resourceAddress}>{resource.address}</Text>
                            {resource.hours && (
                                <View style={styles.hoursRow}>
                                    <Ionicons name="time-outline" size={12} color="#9ca3af" />
                                    <Text style={styles.hoursText}>{resource.hours}</Text>
                                </View>
                            )}
                            {resource.capacity && (
                                <View style={styles.capacityRow}>
                                    <Ionicons name="people-outline" size={12} color="#9ca3af" />
                                    <Text style={styles.capacityText}>Capacity: {resource.capacity}</Text>
                                </View>
                            )}

                            <View style={styles.resourceActions}>
                                <TouchableOpacity
                                    style={styles.navigateButton}
                                    onPress={() => handleNavigate(resource)}
                                >
                                    <Ionicons name="navigate" size={16} color="#fff" />
                                    <Text style={styles.navigateText}>Navigate</Text>
                                </TouchableOpacity>
                                {resource.phone && (
                                    <TouchableOpacity style={styles.callButton}>
                                        <Ionicons name="call" size={16} color="#3b82f6" />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            )}
        </SafeAreaView >
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
    mapContainer: {
        height: 280,
        marginHorizontal: 16,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#1a1a2e',
        overflow: 'hidden',
    },
    mapContainerFullScreen: {
        flex: 1,
        height: '100%',
        marginHorizontal: 0,
        borderRadius: 0,
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapSubtext: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 4,
    },
    mapFloatActions: {
        position: 'absolute',
        top: 60,
        right: 12,
        gap: 8,
    },
    statusOverlay: {
        position: 'absolute',
        top: 8,
        left: 8,
        right: 8,
    },
    mapActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(30, 30, 46, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.3)',
        elevation: 8,
    },
    mapActionText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    legend: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        gap: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 6,
        borderRadius: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: '#fff',
        fontSize: 10,
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
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryChipActive: {
        backgroundColor: '#3b82f6',
        borderColor: '#3b82f6',
    },
    categoryLabel: {
        color: '#9ca3af',
        fontSize: 12,
        fontWeight: '500',
    },
    categoryLabelActive: {
        color: '#fff',
    },
    resourceList: {
        flex: 1,
        marginTop: 12,
    },
    resourceListContent: {
        padding: 16,
        paddingTop: 8,
        gap: 12,
    },
    resourceCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: BorderRadius.lg,
        padding: 16,
        borderWidth: 1,
        borderColor: AppColors.border,
    },
    hazardWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        padding: 8,
        borderRadius: 8,
        marginBottom: 12,
    },
    hazardText: {
        color: '#fbbf24',
        fontSize: 11,
        flex: 1,
    },
    resourceHeader: {
        flexDirection: 'row',
        gap: 12,
    },
    resourceIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    resourceInfo: {
        flex: 1,
    },
    resourceName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    resourceType: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 2,
    },
    resourceMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    resourceDistance: {
        color: '#3b82f6',
        fontSize: 12,
        fontWeight: '600',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    resourceStatus: {
        fontSize: 12,
        fontWeight: '500',
    },
    resourceAddress: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 12,
    },
    hoursRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    hoursText: {
        color: '#9ca3af',
        fontSize: 11,
    },
    capacityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    capacityText: {
        color: '#9ca3af',
        fontSize: 11,
    },
    resourceActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    navigateButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#3b82f6',
        paddingVertical: 10,
        borderRadius: 8,
    },
    navigateText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    callButton: {
        width: 44,
        height: 44,
        borderRadius: 8,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
