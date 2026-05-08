import { AppColors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Callout, Circle, Heatmap, Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

export type ResourceMarker = {
    id: string;
    name: string;
    type: string;
    distance: string;
    status: string;
    category: string;
    coordinates: number[];
    address?: string;
    phone?: string;
    hours?: string;
    capacity?: string;
    icon?: string;
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
    onNavigate?: (resource: ResourceMarker) => void;
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

// Category-specific icon and color mapping
const CATEGORY_ICON_MAP: Record<string, { icon: string; color: string }> = {
    medical: { icon: 'medkit', color: '#ef4444' },
    shelter: { icon: 'home', color: '#3b82f6' },
    emergency: { icon: 'flame', color: '#f97316' },
    supplies: { icon: 'cube', color: '#8b5cf6' },
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

const getResourceIconAndColor = (category: string, type?: string) => {
    // More specific type-based icons
    const typeLower = (type || '').toLowerCase();
    if (typeLower.includes('hospital')) return { icon: 'medkit', color: '#ef4444' };
    if (typeLower.includes('clinic')) return { icon: 'fitness', color: '#f87171' };
    if (typeLower.includes('fire')) return { icon: 'flame', color: '#f97316' };
    if (typeLower.includes('police')) return { icon: 'shield-checkmark', color: '#f59e0b' };
    if (typeLower.includes('ambulance')) return { icon: 'car', color: '#fb923c' };
    if (typeLower.includes('pharmacy')) return { icon: 'medical', color: '#a78bfa' };
    if (typeLower.includes('supermarket') || typeLower.includes('store')) return { icon: 'cart', color: '#8b5cf6' };

    // Fall back to category-level mapping
    return CATEGORY_ICON_MAP[category] || { icon: 'location', color: '#3b82f6' };
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'open': return '#22c55e';
        case 'limited': return '#eab308';
        case 'closed': return '#ef4444';
        default: return '#6b7280';
    }
};

const getStatusLabel = (status: string) => {
    switch (status) {
        case 'open': return 'Open';
        case 'limited': return 'Limited';
        case 'closed': return 'Closed';
        default: return 'Unknown';
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
    destination,
    onNavigate
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
            // Use a zoom level that makes hazard circles clearly visible
            // latitudeDelta 0.04 ~ 4.4km view, which fits a 2km radius circle nicely
            mapRef.current.animateToRegion({
                latitude: focusLocation.lat,
                longitude: focusLocation.lng,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
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
                {hazards.filter(h => h.type === 'flood' || h.type === 'wildfire').length > 0 && (
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

                {/* Resource markers with rich callouts */}
                {resources.map((resource) => {
                    const { icon, color } = getResourceIconAndColor(resource.category, resource.type);
                    const statusColor = getStatusColor(resource.status);
                    const statusLabel = getStatusLabel(resource.status);

                    return (
                        <Marker
                            key={resource.id}
                            coordinate={{
                                latitude: resource.coordinates[1],
                                longitude: resource.coordinates[0],
                            }}
                            zIndex={30}
                        >
                            {/* Category-specific marker icon */}
                            <View style={markerStyles.markerWrapper}>
                                <View style={[markerStyles.resourceMarkerContainer, { backgroundColor: color }]}>
                                    <Ionicons name={icon as any} size={16} color="white" />
                                </View>
                                <View style={[markerStyles.markerTip, { borderTopColor: color }]} />
                            </View>

                            {/* Rich Callout Popup */}
                            <Callout
                                tooltip={true}
                                onPress={() => onNavigate?.(resource)}
                                style={Platform.OS === 'android' ? { width: 260 } : undefined}
                            >
                                <View style={calloutStyles.container}>
                                    {/* Header row */}
                                    <View style={calloutStyles.header}>
                                        <View style={[calloutStyles.iconBadge, { backgroundColor: color + '25' }]}>
                                            <Ionicons name={icon as any} size={18} color={color} />
                                        </View>
                                        <View style={calloutStyles.headerInfo}>
                                            <Text style={calloutStyles.name} numberOfLines={1}>{resource.name}</Text>
                                            <Text style={calloutStyles.type}>{resource.type}</Text>
                                        </View>
                                    </View>

                                    {/* Status + Distance row */}
                                    <View style={calloutStyles.metaRow}>
                                        <View style={calloutStyles.statusBadge}>
                                            <View style={[calloutStyles.statusDot, { backgroundColor: statusColor }]} />
                                            <Text style={[calloutStyles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                                        </View>
                                        <View style={calloutStyles.distanceBadge}>
                                            <Ionicons name="navigate-outline" size={12} color="#3b82f6" />
                                            <Text style={calloutStyles.distanceText}>{resource.distance}</Text>
                                        </View>
                                        {resource.capacity && (
                                            <View style={calloutStyles.capacityBadge}>
                                                <Ionicons name="people-outline" size={12} color="#9ca3af" />
                                                <Text style={calloutStyles.capacityText}>{resource.capacity}</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Address */}
                                    {resource.address && resource.address !== 'Address not available' && (
                                        <View style={calloutStyles.addressRow}>
                                            <Ionicons name="location-outline" size={13} color="#9ca3af" />
                                            <Text style={calloutStyles.addressText} numberOfLines={2}>{resource.address}</Text>
                                        </View>
                                    )}

                                    {/* Hours */}
                                    {resource.hours && (
                                        <View style={calloutStyles.hoursRow}>
                                            <Ionicons name="time-outline" size={13} color="#9ca3af" />
                                            <Text style={calloutStyles.hoursText}>{resource.hours}</Text>
                                        </View>
                                    )}

                                    {/* Navigate Button */}
                                    <View style={calloutStyles.navigateButton}>
                                        <Ionicons name="navigate" size={14} color="#fff" />
                                        <Text style={calloutStyles.navigateText}>Navigate</Text>
                                    </View>

                                    {/* Callout arrow */}
                                    <View style={calloutStyles.arrow} />
                                </View>
                            </Callout>
                        </Marker>
                    );
                })}
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
    resourceMarkerContainer: {
        width: 34,
        height: 34,
        borderRadius: 17,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2.5,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 8,
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

const calloutStyles = StyleSheet.create({
    container: {
        backgroundColor: '#1a1a2e',
        borderRadius: 14,
        padding: 14,
        width: 260,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 15,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
    },
    iconBadge: {
        width: 38,
        height: 38,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: {
        flex: 1,
    },
    name: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    type: {
        color: '#9ca3af',
        fontSize: 12,
        marginTop: 1,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
        flexWrap: 'wrap',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(59, 130, 246, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    distanceText: {
        color: '#3b82f6',
        fontSize: 11,
        fontWeight: '600',
    },
    capacityBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    capacityText: {
        color: '#9ca3af',
        fontSize: 11,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
        marginBottom: 6,
    },
    addressText: {
        color: '#9ca3af',
        fontSize: 11,
        flex: 1,
        lineHeight: 16,
    },
    hoursRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
    },
    hoursText: {
        color: '#9ca3af',
        fontSize: 11,
    },
    navigateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#3b82f6',
        paddingVertical: 9,
        borderRadius: 8,
    },
    navigateText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    arrow: {
        position: 'absolute',
        bottom: -8,
        alignSelf: 'center',
        left: '50%',
        marginLeft: -8,
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#1a1a2e',
    },
});
