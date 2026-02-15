import NativeMap from '@/components/NativeMap';
import { AppColors, BorderRadius } from '@/constants/Colors';
import { getRoute, RouteData } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function NavigationScreen() {
    const { destLat, destLon, destName } = useLocalSearchParams<{ destLat: string; destLon: string; destName: string }>();
    const [route, setRoute] = useState<RouteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);

    useEffect(() => {
        const fetchRoute = async () => {
            try {
                // Get current location
                const location = await Location.getCurrentPositionAsync({});
                setUserLoc(location.coords);

                if (destLat && destLon) {
                    const data = await getRoute(
                        [location.coords.latitude, location.coords.longitude],
                        [Number(destLat), Number(destLon)]
                    );
                    setRoute(data);
                }
            } catch (err) {
                console.error('Navigation error:', err);
                Alert.alert('Error', 'Could not calculate route. Please check your connection.');
            } finally {
                setLoading(false);
            }
        };

        fetchRoute();
    }, [destLat, destLon]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={AppColors.primary} />
                <Text style={styles.loadingText}>Calculating route...</Text>
            </View>
        );
    }

    const nextStep = route?.steps[0];

    return (
        <View style={styles.container}>
            {/* Map View - 3D Perspective */}
            <View style={styles.mapContainer}>
                {userLoc && (
                    <NativeMap
                        userLocation={{ lat: userLoc.latitude, lng: userLoc.longitude }}
                        resources={[]}
                        categoryColors={{}}
                        routeGeometry={route?.geometry}
                        focusLocation={route ? undefined : { lat: Number(destLat), lng: Number(destLon) }}
                        destination={{ lat: Number(destLat), lng: Number(destLon), name: destName }}
                        pitch={60}
                        bearing={0}
                    />
                )}
            </View>

            {/* Floating Top Card (Instruction) */}
            <View style={styles.floatingTopCard}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backFab}>
                    <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={styles.nextStepInfo}>
                    <View style={styles.nextStepIcon}>
                        <Ionicons name={getInstructionIcon(nextStep?.instruction)} size={32} color="#fff" />
                    </View>
                    <View style={styles.nextStepTextContainer}>
                        <Text style={styles.nextStepLabel}>NEXT</Text>
                        <Text style={styles.nextStepInstruction} numberOfLines={2}>
                            {nextStep?.instruction || 'Following route...'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Stats Overlay (Glassmorphism) */}
            {route && (
                <View style={styles.statsPanel}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{(route.distance / 1000).toFixed(1)}</Text>
                        <Text style={styles.statUnit}>km</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{Math.ceil(route.duration / 60)}</Text>
                        <Text style={styles.statUnit}>min</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>
                            {(() => {
                                const arrival = new Date(Date.now() + route.duration * 1000);
                                return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                            })()}
                        </Text>
                        <Text style={styles.statUnit}>ETA</Text>
                    </View>
                </View>
            )}

            {/* Instructions ScrollView */}
            <View style={styles.instructionsContainer}>
                <View style={styles.dragHandle} />
                <View style={styles.instructionsHeader}>
                    <Text style={styles.instructionsTitle}>Route Details</Text>
                    <Text style={styles.destLabel}>To: {destName}</Text>
                </View>
                <ScrollView contentContainerStyle={styles.instructionsList} showsVerticalScrollIndicator={false}>
                    {route?.steps.map((step, idx) => (
                        <View key={idx} style={styles.stepItem}>
                            <View style={styles.stepIconContainer}>
                                <Ionicons name={getInstructionIcon(step.instruction)} size={20} color="#3b82f6" />
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepText}>{step.instruction}</Text>
                                <Text style={styles.stepMeta}>
                                    {step.distance > 0 ? `${(step.distance / 1000).toFixed(2)} km` : ''}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {!route && <Text style={styles.noInstructions}>No route data available</Text>}
                </ScrollView>
            </View>
        </View>
    );
}

function getInstructionIcon(instruction: string | undefined) {
    if (!instruction) return 'navigate-circle';
    const text = instruction.toLowerCase();
    if (text.includes('left')) return 'arrow-back-circle';
    if (text.includes('right')) return 'arrow-forward-circle';
    if (text.includes('straight')) return 'arrow-up-circle';
    if (text.includes('destination')) return 'flag';
    if (text.includes('roundabout')) return 'sync';
    if (text.includes('turn')) return 'return-up-forward-outline';
    return 'navigate-circle';
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0d0d0d',
    },
    loadingText: {
        color: '#fff',
        marginTop: 12,
        fontSize: 16,
    },
    mapContainer: {
        flex: 1,
    },
    floatingTopCard: {
        position: 'absolute',
        top: 60,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 100,
    },
    backFab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(30, 30, 30, 0.8)',
        backdropFilter: 'blur(10px)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    nextStepInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#22c55e', // Vibrant green for "Go"
        borderRadius: BorderRadius.xl,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    nextStepIcon: {
        marginRight: 16,
    },
    nextStepTextContainer: {
        flex: 1,
    },
    nextStepLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    nextStepInstruction: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
    },
    statsPanel: {
        position: 'absolute',
        bottom: height * 0.35 + 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: 'rgba(30,30,46,0.7)',
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        zIndex: 50,
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
    },
    statUnit: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '700',
        marginTop: -2,
    },
    instructionsContainer: {
        height: height * 0.35,
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 20,
    },
    dragHandle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    instructionsHeader: {
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    instructionsTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '800',
    },
    destLabel: {
        color: '#9ca3af',
        fontSize: 14,
        marginTop: 2,
    },
    instructionsList: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    stepIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    stepContent: {
        flex: 1,
    },
    stepText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
        lineHeight: 22,
    },
    stepMeta: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 2,
    },
    noInstructions: {
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 40,
    },
});
