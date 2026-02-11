import NativeMap from '@/components/NativeMap';
import { AppColors, BorderRadius } from '@/constants/Colors';
import { DUMMY_HAZARDS, MOCK_FAMILY, MOCK_RESOURCES, MOCK_USER_LOCATION } from '@/constants/Data';
import { openGoogleMapsNavigation } from '@/utils';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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
    const [userLocation, setUserLocation] = useState(MOCK_USER_LOCATION);
    const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
    const [simulatedFamily, setSimulatedFamily] = useState(MOCK_FAMILY);

    // Generate random family positions near the user
    const generateFamilyLocations = (center: { lat: number; lng: number }) => {
        return MOCK_FAMILY.map((member) => {
            if (!member.coordinates) return member;
            // Random offset: ~0.5 to 3 km in each direction
            const latOffset = (Math.random() - 0.5) * 0.04;   // ~2km spread
            const lngOffset = (Math.random() - 0.5) * 0.04;
            return {
                ...member,
                coordinates: [
                    center.lng + lngOffset,  // longitude
                    center.lat + latOffset,  // latitude
                ] as [number, number],
            };
        });
    };

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
                            'Location access was denied. Showing default location. You can enable it in Settings.',
                            [{ text: 'OK' }]
                        );
                    }
                    return;
                }

                setLocationPermission(true);

                // Get initial location
                const currentLocation = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.Balanced,
                });
                const loc = {
                    lat: currentLocation.coords.latitude,
                    lng: currentLocation.coords.longitude,
                };
                setUserLocation(loc);
                setSimulatedFamily(generateFamilyLocations(loc));

                // Start watching position for real-time updates
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.Balanced,
                        timeInterval: 5000,      // Update every 5 seconds
                        distanceInterval: 10,     // Or when moved 10 meters
                    },
                    (newLocation) => {
                        setUserLocation({
                            lat: newLocation.coords.latitude,
                            lng: newLocation.coords.longitude,
                        });
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
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, []);

    // Periodically shuffle family member positions (simulate movement)
    useEffect(() => {
        if (locationPermission !== true) return;

        const interval = setInterval(() => {
            setSimulatedFamily(generateFamilyLocations(userLocation));
        }, 15000); // every 15 seconds

        return () => clearInterval(interval);
    }, [locationPermission, userLocation]);

    const filteredResources = MOCK_RESOURCES.filter(
        r => selectedCategory === 'all' || r.category === selectedCategory
    );

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'open': return '#22c55e';
            case 'limited': return '#eab308';
            case 'closed': return '#ef4444';
            default: return '#6b7280';
        }
    };

    const handleNavigate = (resource: typeof MOCK_RESOURCES[0]) => {
        openGoogleMapsNavigation({
            lat: resource.coordinates[1],
            lng: resource.coordinates[0],
            name: resource.name,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
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

            {/* Map */}
            <View style={styles.mapContainer}>
                <NativeMap
                    userLocation={userLocation}
                    resources={filteredResources}
                    categoryColors={CATEGORY_COLORS}
                    hazards={DUMMY_HAZARDS}
                    familyMembers={simulatedFamily}
                    isLiveLocation={locationPermission === true}
                />
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

            {/* Resource List */}
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
    mapContainer: {
        height: 280,
        marginHorizontal: 16,
        borderRadius: BorderRadius.lg,
        backgroundColor: '#1a1a2e',
        overflow: 'hidden',
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
    },
    mapSubtext: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 4,
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
