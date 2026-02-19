import { AppColors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Heatmap, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

type ResourceMarker = {
    id: string;
    name: string;
    type: string;
    distance: string;
    status: string;
    category: string;
    coordinates: number[];
};

type HazardZone = {
    id: string;
    type: string;
    title: string;
    severity: string;
    location: { lat: number; lng: number };
};

type FamilyMarker = {
    id: string;
    name: string;
    status: string;
    location?: string;
    lastUpdate: string;
    coordinates?: number[];
};

type NativeMapProps = {
    userLocation: { lat: number; lng: number };
    resources: ResourceMarker[];
    categoryColors: Record<string, string>;
    hazards?: HazardZone[];
    familyMembers?: FamilyMarker[];
    isLiveLocation?: boolean;
    focusLocation?: { lat: number; lng: number } | null;
    routeGeometry?: string; // JSON string of GeoJSON LineString
    pitch?: number;
    bearing?: number;
    destination?: { lat: number; lng: number; name?: string };
};

const SEVERITY_COLORS: Record<string, { fill: string; stroke: string }> = {
    critical: { fill: 'rgba(239, 68, 68, 0.25)', stroke: 'rgba(239, 68, 68, 0.8)' },
    high: { fill: 'rgba(249, 115, 22, 0.2)', stroke: 'rgba(249, 115, 22, 0.7)' },
    moderate: { fill: 'rgba(234, 179, 8, 0.15)', stroke: 'rgba(234, 179, 8, 0.6)' },
    low: { fill: 'rgba(34, 197, 94, 0.15)', stroke: 'rgba(34, 197, 94, 0.6)' },
};

const SEVERITY_RADIUS: Record<string, number> = {
    critical: 2000,
    high: 1200,
    moderate: 800,
    low: 400,
};

const FAMILY_STATUS_COLORS: Record<string, string> = {
    safe: '#22c55e',
    danger: '#ef4444',
    pending: '#eab308',
    unknown: '#6b7280',
};

const getIconForHazard = (type: string | undefined) => {
    switch (type) {
        case 'flood': return 'water';
        case 'wildfire': return 'flame';
        case 'tsunami': return 'boat';
        case 'hurricane': return 'thunderstorm';
        case 'earthquake': return 'pulse';
        default: return 'alert-circle';
    }
};

const getIconForResource = (type: string | undefined) => {
    switch (type) {
        case 'hospital': return 'medkit';
        case 'fire_station': return 'flame';
        case 'shelter': return 'home';
        default: return 'location';
    }
};

const NativeMap = React.forwardRef<any, NativeMapProps>(({
    userLocation,
    resources,
    categoryColors,
    hazards = [],
    familyMembers = [],
    isLiveLocation = false,
    focusLocation,
    routeGeometry,
    pitch = 0,
    bearing = 0,
    destination
}, ref) => {
    const mapRef = React.useRef<any>(null);

    // Expose centerOnUser to parent via ref
    React.useImperativeHandle(ref, () => ({
        centerOnUser: () => {
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: userLocation.lat,
                    longitude: userLocation.lng,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                }, 800);
            }
        },
        animateToRegion: (region: any, duration: number) => {
            if (mapRef.current) {
                mapRef.current.animateToRegion(region, duration);
            }
        },
    }));
    const prevLocationRef = React.useRef(userLocation);

    // Animate to user's real location whenever it changes significantly
    React.useEffect(() => {
        // Only auto-follow user if we are NOT focusing on something else
        if (focusLocation) return;

        const prev = prevLocationRef.current;
        const moved = Math.abs(prev.lat - userLocation.lat) > 0.001 ||
            Math.abs(prev.lng - userLocation.lng) > 0.001;

        if (mapRef.current && moved) {
            mapRef.current.animateToRegion({
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 1000);
        }
        prevLocationRef.current = userLocation;
    }, [userLocation, focusLocation]);

    // Animate to focusLocation when it changes
    React.useEffect(() => {
        if (mapRef.current && focusLocation) {
            mapRef.current.animateToRegion({
                latitude: focusLocation.lat,
                longitude: focusLocation.lng,
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            }, 1000);
        }
    }, [focusLocation]);

    // Handle 3D changes (pitch/bearing)
    React.useEffect(() => {
        if (mapRef.current && (pitch !== 0 || bearing !== 0)) {
            mapRef.current.animateCamera({
                pitch: pitch,
                bearing: bearing,
            }, { duration: 1000 });
        }
    }, [pitch, bearing]);

    // "Center on me" button handler
    const centerOnUser = () => {
        if (mapRef.current) {
            mapRef.current.animateToRegion({
                latitude: userLocation.lat,
                longitude: userLocation.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
            }, 800);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <MapView
                ref={mapRef}
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFillObject}
                initialRegion={{
                    latitude: userLocation.lat,
                    longitude: userLocation.lng,
                    latitudeDelta: 0.04,
                    longitudeDelta: 0.04,
                }}
                showsUserLocation={true}
                showsMyLocationButton={false}
            >
                {/* Route Polyline */}
                {routeGeometry && (() => {
                    try {
                        const geojson = JSON.parse(routeGeometry);
                        if (geojson.type === 'LineString') {
                            const coordinates = geojson.coordinates.map((c: any) => ({
                                latitude: c[1],
                                longitude: c[0],
                            }));
                            return (
                                <>
                                    {/* Outer Glow */}
                                    <Polyline
                                        coordinates={coordinates}
                                        strokeColor={"rgba(59, 130, 246, 0.4)"}
                                        strokeWidth={10}
                                        lineJoin="round"
                                        lineCap="round"
                                    />
                                    {/* Inner "Laser" Line */}
                                    <Polyline
                                        coordinates={coordinates}
                                        strokeColor={AppColors.primary || "#3b82f6"}
                                        strokeWidth={5}
                                        lineJoin="round"
                                        lineCap="round"
                                    />
                                </>
                            );
                        }
                    } catch (e) {
                        console.error('Failed to parse route geometry', e);
                    }
                    return null;
                })()}

                {/* Heatmap for Flash Hazards (Flood/Wildfire Corridor) */}
                {hazards.length > 0 && (
                    /* @ts-ignore */
                    <Heatmap
                        points={hazards.filter(h => h.type === 'flood' || h.type === 'wildfire').map(h => ({
                            latitude: h.location.lat,
                            longitude: h.location.lng,
                            weight: h.severity === 'critical' ? 5 : h.severity === 'high' ? 3 : 1
                        }))}
                        radius={50}
                        opacity={0.6}
                        gradient={{
                            colors: ['#22c55e00', '#eab308', '#f97316', '#ef4444'],
                            startPoints: [0, 0.4, 0.7, 1],
                            colorMapSize: 256
                        }}
                    />
                )}

                {/* Hazard zone circles */}
                {hazards.map((hazard) => {
                    const colors = SEVERITY_COLORS[hazard.severity] || SEVERITY_COLORS.moderate;
                    const radius = SEVERITY_RADIUS[hazard.severity] || 350;
                    return (
                        <Circle
                            key={`hazard-zone-${hazard.id}`}
                            center={{
                                latitude: hazard.location.lat,
                                longitude: hazard.location.lng,
                            }}
                            radius={radius}
                            fillColor={colors.fill}
                            strokeColor={colors.stroke}
                            strokeWidth={2}
                        />
                    );
                })}

                {/* Hazard center markers */}
                {hazards.map((hazard) => (
                    <Marker
                        key={`hazard-marker-${hazard.id}`}
                        coordinate={{
                            latitude: hazard.location.lat,
                            longitude: hazard.location.lng,
                        }}
                        title={hazard.title}
                        description={`Severity: ${hazard.severity.toUpperCase()}`}
                        zIndex={60}
                    >
                        <View style={markerStyles.markerWrapper}>
                            <View style={[markerStyles.markerContainer, { backgroundColor: hazard.severity === 'critical' ? '#ef4444' : hazard.severity === 'high' ? '#f97316' : '#eab308' }]}>
                                <Ionicons name={getIconForHazard(hazard.type) as any} size={18} color="white" />
                            </View>
                            <View style={[markerStyles.markerTip, { borderTopColor: hazard.severity === 'critical' ? '#ef4444' : hazard.severity === 'high' ? '#f97316' : '#eab308' }]} />
                        </View>
                    </Marker>
                ))}

                {/* User location pointer */}
                <Marker
                    coordinate={{
                        latitude: userLocation.lat,
                        longitude: userLocation.lng,
                    }}
                    title="You"
                    zIndex={50}
                >
                    <View style={markerStyles.youMarker}>
                        <View style={markerStyles.youMarkerInner} />
                    </View>
                </Marker>

                {/* Destination Marker */}
                {destination && (
                    <Marker
                        coordinate={{
                            latitude: destination.lat,
                            longitude: destination.lng,
                        }}
                        title={destination.name || 'Destination'}
                        zIndex={100}
                    >
                        <View style={markerStyles.markerWrapper}>
                            <View style={[markerStyles.markerContainer, { backgroundColor: '#ef4444' }]}>
                                <Ionicons name="flag" size={18} color="white" />
                            </View>
                            <View style={[markerStyles.markerTip, { borderTopColor: '#ef4444' }]} />
                        </View>
                    </Marker>
                )}

                {/* Family member markers */}
                {familyMembers.filter(m => m.coordinates).map((member) => (
                    <Marker
                        key={`family-${member.id}`}
                        coordinate={{
                            latitude: member.coordinates![1],
                            longitude: member.coordinates![0],
                        }}
                        title={`Family: ${member.name}`}
                        zIndex={40}
                    >
                        <View style={[markerStyles.familyMarker, { borderColor: FAMILY_STATUS_COLORS[member.status] || '#6b7280' }]}>
                            <Ionicons
                                name={member.status === 'safe' ? 'checkmark-circle' : member.status === 'danger' ? 'warning' : 'person'}
                                size={14}
                                color="white"
                                style={{ position: 'absolute', top: -10, right: -10 }}
                            />
                            <Text style={markerStyles.familyMarkerText}>{member.name.charAt(0)}</Text>
                        </View>
                    </Marker>
                ))}

                {/* General Resource markers */}
                {resources.map((resource) => (
                    <Marker
                        key={resource.id}
                        coordinate={{
                            latitude: resource.coordinates[1],
                            longitude: resource.coordinates[0],
                        }}
                        title={resource.name}
                        description={resource.type}
                        zIndex={30}
                    >
                        <View style={markerStyles.markerWrapper}>
                            <View style={[markerStyles.markerContainer, { backgroundColor: categoryColors?.[resource.category] || '#3b82f6' }]}>
                                <Ionicons name={getIconForResource(resource.type) as any} size={18} color="white" />
                            </View>
                            <View style={[markerStyles.markerTip, { borderTopColor: categoryColors?.[resource.category] || '#3b82f6' }]} />
                        </View>
                    </Marker>
                ))}
            </MapView>

            {/* Float actions */}
            <TouchableOpacity style={markerStyles.locateButton} onPress={centerOnUser} activeOpacity={0.8}>
                <Text style={markerStyles.locateIcon}>📍</Text>
            </TouchableOpacity>
        </View>
    );
});

export default NativeMap;
const markerStyles = StyleSheet.create({
    markerWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 10,
    },
    markerTip: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 10,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -2,
    },
    youMarker: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(59, 130, 246, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    youMarkerInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#3b82f6',
        borderWidth: 2,
        borderColor: '#fff',
    },
    familyMarker: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1e1e2e',
        borderWidth: 3,
        justifyContent: 'center',
        alignItems: 'center',
    },
    familyMarkerText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    locateButton: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(30, 30, 46, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.5)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    locateIcon: {
        fontSize: 20,
    },
});
