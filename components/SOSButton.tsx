import { sendSOS } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const LONG_PRESS_DURATION = 1500; // ms
const COUNTDOWN_SECONDS = 3;

export default function SOSButton() {
    const [showConfirm, setShowConfirm] = useState(false);
    const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
    const [sending, setSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; notified: number } | null>(null);

    const pulseAnim = useRef(new Animated.Value(1)).current;
    const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Pulsing animation
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // Countdown timer
    useEffect(() => {
        if (showConfirm && countdown > 0 && !sending) {
            countdownRef.current = setInterval(() => {
                setCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(countdownRef.current!);
                        triggerSOS();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [showConfirm]);

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        setShowConfirm(true);
        setCountdown(COUNTDOWN_SECONDS);
        setResult(null);
    };

    const cancelSOS = () => {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setShowConfirm(false);
        setCountdown(COUNTDOWN_SECONDS);
        setSending(false);
        setResult(null);
    };

    const triggerSOS = async () => {
        setSending(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        try {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const res = await sendSOS(loc.coords.latitude, loc.coords.longitude);
            setResult(res);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (err) {
            console.error('[SOS] Failed:', err);
            setResult({ success: false, notified: 0 });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setSending(false);
        }
    };

    return (
        <>
            {/* Floating SOS Button */}
            <Animated.View style={[styles.container, { transform: [{ scale: pulseAnim }] }]}>
                <TouchableOpacity
                    style={styles.button}
                    onLongPress={handleLongPress}
                    delayLongPress={LONG_PRESS_DURATION}
                    activeOpacity={0.8}
                >
                    <Ionicons name="warning" size={22} color="#fff" />
                    <Text style={styles.buttonText}>SOS</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Confirmation Modal */}
            <Modal visible={showConfirm} transparent animationType="fade">
                <View style={styles.overlay}>
                    <View style={styles.modal}>
                        {result ? (
                            // Result state
                            <>
                                <Ionicons
                                    name={result.success ? 'checkmark-circle' : 'close-circle'}
                                    size={64}
                                    color={result.success ? '#22c55e' : '#ef4444'}
                                />
                                <Text style={styles.modalTitle}>
                                    {result.success ? 'SOS Sent!' : 'SOS Failed'}
                                </Text>
                                <Text style={styles.modalSubtext}>
                                    {result.success
                                        ? `${result.notified} family member${result.notified !== 1 ? 's' : ''} notified.`
                                        : 'Could not send alert. Check your connection.'}
                                </Text>
                                <TouchableOpacity style={styles.closeBtn} onPress={cancelSOS}>
                                    <Text style={styles.closeBtnText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        ) : sending ? (
                            // Sending state
                            <>
                                <ActivityIndicator size="large" color="#ef4444" />
                                <Text style={styles.modalTitle}>Sending SOS...</Text>
                                <Text style={styles.modalSubtext}>Broadcasting your location to family.</Text>
                            </>
                        ) : (
                            // Countdown state
                            <>
                                <View style={styles.countdownCircle}>
                                    <Text style={styles.countdownText}>{countdown}</Text>
                                </View>
                                <Text style={styles.modalTitle}>🚨 Emergency SOS</Text>
                                <Text style={styles.modalSubtext}>
                                    Sending alert to your family in {countdown} seconds...
                                </Text>
                                <TouchableOpacity style={styles.cancelBtn} onPress={cancelSOS}>
                                    <Text style={styles.cancelBtnText}>Cancel</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        zIndex: 100,
    },
    button: {
        backgroundColor: '#ef4444',
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ef4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    buttonText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '900',
        marginTop: 1,
        letterSpacing: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modal: {
        backgroundColor: '#1a1a1a',
        borderRadius: 24,
        padding: 32,
        alignItems: 'center',
        width: '80%',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    countdownCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 4,
        borderColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    countdownText: {
        color: '#ef4444',
        fontSize: 36,
        fontWeight: '900',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '800',
        marginTop: 12,
        textAlign: 'center',
    },
    modalSubtext: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        marginTop: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
    cancelBtn: {
        marginTop: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    cancelBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    closeBtn: {
        marginTop: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    closeBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
