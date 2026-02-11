import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Circle, Marker } from 'react-native-maps';

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
};

const SEVERITY_COLORS: Record<string, { fill: string; stroke: string }> = {
    critical: { fill: 'rgba(239, 68, 68, 0.25)', stroke: 'rgba(239, 68, 68, 0.8)' },
    high: { fill: 'rgba(249, 115, 22, 0.2)', stroke: 'rgba(249, 115, 22, 0.7)' },
    moderate: { fill: 'rgba(234, 179, 8, 0.15)', stroke: 'rgba(234, 179, 8, 0.6)' },
    low: { fill: 'rgba(34, 197, 94, 0.15)', stroke: 'rgba(34, 197, 94, 0.6)' },
};

const SEVERITY_RADIUS: Record<string, number> = {
    critical: 600,
    high: 450,
    moderate: 350,
    low: 250,
};

const FAMILY_STATUS_COLORS: Record<string, string> = {
    safe: '#22c55e',
    danger: '#ef4444',
    pending: '#eab308',
    unknown: '#6b7280',
};

export default function NativeMap({ userLocation, resources, categoryColors, hazards = [], familyMembers = [], isLiveLocation = false }: NativeMapProps) {
    const mapRef = React.useRef<any>(null);
    const prevLocationRef = React.useRef(userLocation);

    // Animate to user's real location whenever it changes significantly
    React.useEffect(() => {
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
    }, [userLocation]);

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
                {/* Hazard zone circles */}
                {hazards.map((hazard) => {
                    const colors = SEVERITY_COLORS[hazard.severity] || SEVERITY_COLORS.moderate;
                    const radius = SEVERITY_RADIUS[hazard.severity] || 350;
                    return (
                        <Circle
                            key={`hazard-${hazard.id}`}
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
                        pinColor={hazard.severity === 'critical' ? '#ef4444' : hazard.severity === 'high' ? '#f97316' : '#eab308'}
                    />
                ))}

                {/* Your location marker */}
                <Marker
                    coordinate={{
                        latitude: userLocation.lat,
                        longitude: userLocation.lng,
                    }}
                    title="📍 You"
                    description={isLiveLocation ? "Live GPS location" : "Default location"}
                >
                    <View style={markerStyles.youMarker}>
                        <View style={markerStyles.youMarkerInner} />
                    </View>
                </Marker>

                {/* Family member markers */}
                {familyMembers.filter(m => m.coordinates).map((member) => (
                    <Marker
                        key={`family-${member.id}`}
                        coordinate={{
                            latitude: member.coordinates![1],
                            longitude: member.coordinates![0],
                        }}
                        title={`👨‍👩‍👧 ${member.name}`}
                        description={`${member.status.toUpperCase()} • ${member.location} • ${member.lastUpdate}`}
                    >
                        <View style={[markerStyles.familyMarker, { borderColor: FAMILY_STATUS_COLORS[member.status] || '#6b7280' }]}>
                            <Text style={markerStyles.familyMarkerText}>{member.name.charAt(0)}</Text>
                        </View>
                    </Marker>
                ))}

                {/* Resource markers */}
                {resources.map((resource) => (
                    <Marker
                        key={resource.id}
                        coordinate={{
                            latitude: resource.coordinates[1],
                            longitude: resource.coordinates[0],
                        }}
                        title={resource.name}
                        description={`${resource.type} • ${resource.distance} • ${resource.status}`}
                        pinColor={categoryColors[resource.category] || '#3b82f6'}
                    />
                ))}
            </MapView>

            {/* Locate Me Button */}
            <TouchableOpacity style={markerStyles.locateButton} onPress={centerOnUser} activeOpacity={0.8}>
                <Text style={markerStyles.locateIcon}>📍</Text>
            </TouchableOpacity>
        </View>
    );
}

const markerStyles = StyleSheet.create({
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
