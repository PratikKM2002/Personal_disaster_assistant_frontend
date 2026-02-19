import NativeMap from '@/components/NativeMap';
import { AppColors, BorderRadius } from '@/constants/Colors';
import { getRoute, RouteData } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

type TravelMode = 'driving' | 'walking' | 'cycling';

const TRAVEL_MODES: { key: TravelMode; icon: string; label: string }[] = [
    { key: 'driving', icon: 'car', label: 'Drive' },
    { key: 'walking', icon: 'walk', label: 'Walk' },
    { key: 'cycling', icon: 'bicycle', label: 'Bike' },
];

export default function NavigationScreen() {
    const { destLat, destLon, destName } = useLocalSearchParams<{ destLat: string; destLon: string; destName: string }>();
    const [route, setRoute] = useState<RouteData | null>(null);
    const [loading, setLoading] = useState(true);
    const [userLoc, setUserLoc] = useState<{ latitude: number; longitude: number } | null>(null);
    const [travelMode, setTravelMode] = useState<TravelMode>('driving');
    const [panelExpanded, setPanelExpanded] = useState(false);
    const [warningsExpanded, setWarningsExpanded] = useState(false);
    const mapRef = useRef<any>(null);
    const pulseAnim = useRef(new Animated.Value(0.6)).current;
    const panelHeight = useRef(new Animated.Value(height * 0.12)).current;

    // Pulse animation for loading
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.6, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    // Fetch route
    const fetchRoute = useCallback(async (mode: TravelMode) => {
        try {
            setLoading(true);
            const location = await Location.getCurrentPositionAsync({});
            setUserLoc(location.coords);

            if (destLat && destLon) {
                const data = await getRoute(
                    [location.coords.latitude, location.coords.longitude],
                    [Number(destLat), Number(destLon)],
                    mode
                );
                setRoute(data);
            }
        } catch (err) {
            console.error('Navigation error:', err);
            Alert.alert('Error', 'Could not calculate route. Please check your connection.');
        } finally {
            setLoading(false);
        }
    }, [destLat, destLon]);

    useEffect(() => {
        fetchRoute(travelMode);
    }, [travelMode]);

    // Live location tracking
    useEffect(() => {
        let subscription: Location.LocationSubscription | null = null;
        (async () => {
            subscription = await Location.watchPositionAsync(
                { accuracy: Location.Accuracy.High, timeInterval: 3000, distanceInterval: 5 },
                (loc) => setUserLoc(loc.coords)
            );
        })();
        return () => { subscription?.remove(); };
    }, []);

    // Panel animation
    const togglePanel = () => {
        const target = panelExpanded ? height * 0.12 : height * 0.42;
        Animated.spring(panelHeight, {
            toValue: target,
            useNativeDriver: false,
            friction: 10,
        }).start();
        setPanelExpanded(!panelExpanded);
    };

    // Recenter on user
    const handleRecenter = () => {
        if (mapRef.current) {
            mapRef.current.centerOnUser();
        }
    };

    // Handle travel mode switch
    const handleModeChange = (mode: TravelMode) => {
        if (mode === travelMode) return;
        setTravelMode(mode);
    };

    const hasWarnings = route?.warnings && route.warnings.length > 0;
    const isSafe = route?.isSafe !== false;
    const nextStep = route?.steps[0];

    if (loading && !route) {
        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingContent}>
                    <Animated.View style={[styles.loadingPulse, { opacity: pulseAnim }]}>
                        <Ionicons name="navigate" size={48} color={AppColors.primary} />
                    </Animated.View>
                    <Text style={styles.loadingText}>Calculating route...</Text>
                    <Text style={styles.loadingSubtext}>Checking hazards along the way</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map View */}
            <View style={styles.mapContainer}>
                {userLoc && (
                    <NativeMap
                        ref={mapRef}
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
                    <Ionicons name="close" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={[styles.nextStepInfo, hasWarnings && !isSafe && styles.nextStepInfoWarning]}>
                    <View style={styles.nextStepIcon}>
                        <Ionicons name={getInstructionIcon(nextStep?.instruction)} size={28} color="#fff" />
                    </View>
                    <View style={styles.nextStepTextContainer}>
                        <Text style={styles.nextStepLabel}>NEXT</Text>
                        <Text style={styles.nextStepInstruction} numberOfLines={2}>
                            {nextStep?.instruction || 'Following route...'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Hazard Warning Banner */}
            {hasWarnings && (
                <TouchableOpacity
                    style={styles.warningBanner}
                    onPress={() => setWarningsExpanded(!warningsExpanded)}
                    activeOpacity={0.8}
                >
                    <View style={styles.warningBannerHeader}>
                        <Ionicons name="warning" size={18} color="#fff" />
                        <Text style={styles.warningBannerText}>
                            ⚠ {route!.warnings!.length} hazard{route!.warnings!.length > 1 ? 's' : ''} near route
                        </Text>
                        <Ionicons name={warningsExpanded ? "chevron-up" : "chevron-down"} size={16} color="rgba(255,255,255,0.7)" />
                    </View>
                    {warningsExpanded && (
                        <View style={styles.warningsList}>
                            {route!.warnings!.map((w, i) => (
                                <View key={i} style={styles.warningItem}>
                                    <Ionicons name="alert-circle" size={14} color="#fbbf24" />
                                    <Text style={styles.warningItemText}>{w.message}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </TouchableOpacity>
            )}

            {/* Travel Mode Selector */}
            <View style={styles.travelModeContainer}>
                {TRAVEL_MODES.map((mode) => (
                    <TouchableOpacity
                        key={mode.key}
                        style={[
                            styles.travelModeButton,
                            travelMode === mode.key && styles.travelModeButtonActive,
                        ]}
                        onPress={() => handleModeChange(mode.key)}
                        activeOpacity={0.7}
                    >
                        <Ionicons
                            name={mode.icon as any}
                            size={18}
                            color={travelMode === mode.key ? '#fff' : 'rgba(255,255,255,0.5)'}
                        />
                        {travelMode === mode.key && (
                            <Text style={styles.travelModeLabel}>{mode.label}</Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Right-side Action FABs */}
            <View style={styles.mapFabColumn}>
                {/* Recenter Button */}
                <TouchableOpacity style={styles.mapFab} onPress={handleRecenter} activeOpacity={0.8}>
                    <Ionicons name="locate" size={22} color="#3b82f6" />
                </TouchableOpacity>
            </View>

            {/* Route loading indicator overlay */}
            {loading && route && (
                <View style={styles.reloadingOverlay}>
                    <ActivityIndicator size="small" color="#3b82f6" />
                    <Text style={styles.reloadingText}>Recalculating...</Text>
                </View>
            )}

            {/* Bottom Panel */}
            <Animated.View style={[styles.bottomPanel, { height: panelHeight }]}>
                {/* Drag Handle */}
                <TouchableOpacity onPress={togglePanel} style={styles.dragHandleArea} activeOpacity={0.9}>
                    <View style={styles.dragHandle} />
                </TouchableOpacity>

                {/* Stats Row */}
                {route && (
                    <View style={styles.statsRow}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{(route.distance / 1000).toFixed(1)}</Text>
                            <Text style={styles.statUnit}>km</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{Math.ceil(route.duration / 60)}</Text>
                            <Text style={styles.statUnit}>min</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>
                                {(() => {
                                    const arrival = new Date(Date.now() + route.duration * 1000);
                                    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                                })()}
                            </Text>
                            <Text style={styles.statUnit}>ETA</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={[styles.safetyBadge, isSafe ? styles.safetyBadgeSafe : styles.safetyBadgeDanger]}>
                            <Ionicons
                                name={isSafe ? "shield-checkmark" : "warning"}
                                size={14}
                                color={isSafe ? '#22c55e' : '#f59e0b'}
                            />
                            <Text style={[styles.safetyBadgeText, isSafe ? styles.safetyTextSafe : styles.safetyTextDanger]}>
                                {isSafe ? 'Safe' : 'Alert'}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Expanded Step List */}
                {panelExpanded && (
                    <View style={styles.expandedContent}>
                        <View style={styles.instructionsHeader}>
                            <Text style={styles.instructionsTitle}>Route Steps</Text>
                            <Text style={styles.destLabel} numberOfLines={1}>To: {destName}</Text>
                        </View>
                        <ScrollView contentContainerStyle={styles.instructionsList} showsVerticalScrollIndicator={false}>
                            {route?.steps.map((step, idx) => (
                                <View key={idx} style={styles.stepItem}>
                                    <View style={styles.stepNumberCircle}>
                                        <Text style={styles.stepNumber}>{idx + 1}</Text>
                                    </View>
                                    <View style={styles.stepIconContainer}>
                                        <Ionicons name={getInstructionIcon(step.instruction)} size={18} color="#3b82f6" />
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={styles.stepText}>{step.instruction}</Text>
                                        <Text style={styles.stepMeta}>
                                            {step.distance > 0 ? `${(step.distance / 1000).toFixed(2)} km` : ''}
                                            {step.distance > 0 && step.duration > 0 ? '  •  ' : ''}
                                            {step.duration > 0 ? `${Math.ceil(step.duration / 60)} min` : ''}
                                        </Text>
                                    </View>
                                </View>
                            ))}
                            {!route && <Text style={styles.noInstructions}>No route data available</Text>}
                        </ScrollView>
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

function getInstructionIcon(instruction: string | undefined): any {
    if (!instruction) return 'navigate-circle';
    const text = instruction.toLowerCase();
    if (text.includes('left')) return 'arrow-back-circle';
    if (text.includes('right')) return 'arrow-forward-circle';
    if (text.includes('straight') || text.includes('continue')) return 'arrow-up-circle';
    if (text.includes('destination') || text.includes('arrive')) return 'flag';
    if (text.includes('roundabout')) return 'sync';
    if (text.includes('u-turn')) return 'return-down-back';
    if (text.includes('merge')) return 'git-merge';
    if (text.includes('exit')) return 'log-out';
    if (text.includes('turn')) return 'return-up-forward-outline';
    return 'navigate-circle';
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    // --- Loading ---
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0a0a1a',
    },
    loadingContent: {
        alignItems: 'center',
    },
    loadingPulse: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    loadingText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    loadingSubtext: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 13,
        marginTop: 6,
    },
    // --- Map ---
    mapContainer: {
        flex: 1,
    },
    // --- Floating Top Card ---
    floatingTopCard: {
        position: 'absolute',
        top: 56,
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 100,
    },
    backFab: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(20, 20, 30, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    nextStepInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#22c55e',
        borderRadius: BorderRadius.xl,
        padding: 14,
        shadowColor: '#22c55e',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
    },
    nextStepInfoWarning: {
        backgroundColor: '#f59e0b',
        shadowColor: '#f59e0b',
    },
    nextStepIcon: {
        marginRight: 12,
    },
    nextStepTextContainer: {
        flex: 1,
    },
    nextStepLabel: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    nextStepInstruction: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    // --- Hazard Warning Banner ---
    warningBanner: {
        position: 'absolute',
        top: 116,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(245, 158, 11, 0.9)',
        borderRadius: BorderRadius.lg,
        padding: 10,
        zIndex: 99,
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    warningBannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    warningBannerText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
        flex: 1,
    },
    warningsList: {
        marginTop: 8,
        gap: 6,
    },
    warningItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingLeft: 4,
    },
    warningItemText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
        flex: 1,
    },
    // --- Travel Mode Selector ---
    travelModeContainer: {
        position: 'absolute',
        left: 16,
        bottom: height * 0.12 + 20,
        flexDirection: 'row',
        backgroundColor: 'rgba(20, 20, 30, 0.85)',
        borderRadius: 24,
        padding: 4,
        gap: 2,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
        zIndex: 50,
    },
    travelModeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 5,
    },
    travelModeButtonActive: {
        backgroundColor: '#3b82f6',
    },
    travelModeLabel: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    // --- Map FABs ---
    mapFabColumn: {
        position: 'absolute',
        right: 16,
        bottom: height * 0.12 + 20,
        gap: 10,
        zIndex: 50,
    },
    mapFab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(20, 20, 30, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(59, 130, 246, 0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
    },
    // --- Reloading Overlay ---
    reloadingOverlay: {
        position: 'absolute',
        top: height * 0.5 - 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(20,20,30,0.9)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        zIndex: 80,
    },
    reloadingText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        fontWeight: '600',
    },
    // --- Bottom Panel ---
    bottomPanel: {
        backgroundColor: '#141420',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 20,
        overflow: 'hidden',
    },
    dragHandleArea: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    dragHandle: {
        width: 40,
        height: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 2,
    },
    // --- Stats Row ---
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '900',
    },
    statUnit: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '700',
        marginTop: -2,
        textTransform: 'uppercase',
    },
    statDivider: {
        width: 1,
        height: 28,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    // --- Safety Badge ---
    safetyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    safetyBadgeSafe: {
        backgroundColor: 'rgba(34, 197, 94, 0.15)',
    },
    safetyBadgeDanger: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
    },
    safetyBadgeText: {
        fontSize: 12,
        fontWeight: '800',
    },
    safetyTextSafe: {
        color: '#22c55e',
    },
    safetyTextDanger: {
        color: '#f59e0b',
    },
    // --- Expanded Content ---
    expandedContent: {
        flex: 1,
    },
    instructionsHeader: {
        paddingHorizontal: 24,
        paddingTop: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
    },
    instructionsTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '800',
    },
    destLabel: {
        color: '#6b7280',
        fontSize: 12,
        maxWidth: '50%',
    },
    instructionsList: {
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    stepNumberCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    stepNumber: {
        color: '#3b82f6',
        fontSize: 10,
        fontWeight: '900',
    },
    stepIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepContent: {
        flex: 1,
    },
    stepText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    stepMeta: {
        color: '#4b5563',
        fontSize: 11,
        marginTop: 2,
    },
    noInstructions: {
        color: '#6b7280',
        textAlign: 'center',
        marginTop: 40,
    },
});
