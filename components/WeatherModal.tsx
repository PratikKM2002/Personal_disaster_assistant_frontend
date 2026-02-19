import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WeatherData } from '../services/api';

interface WeatherModalProps {
    visible: boolean;
    onClose: () => void;
    data: WeatherData | undefined;
    locationName: string;
}

// Weather code mapping to icon/label
function getWeatherInfo(code: number) {
    // WMO Weather interpretation codes (WW)
    // 0: Clear sky
    // 1, 2, 3: Mainly clear, partly cloudy, and overcast
    // 45, 48: Fog
    // 51, 53, 55: Drizzle
    // 61, 63, 65: Rain
    // 71, 73, 75: Snow
    // 95: Thunderstorm
    if (code === 0) return { icon: 'sunny', label: 'Clear Sky', color: '#fbbf24' };
    if (code <= 3) return { icon: 'partly-sunny', label: 'Partly Cloudy', color: '#9ca3af' };
    if (code <= 48) return { icon: 'cloudy', label: 'Foggy', color: '#6b7280' };
    if (code <= 67) return { icon: 'rainy', label: 'Rain', color: '#3b82f6' };
    if (code <= 77) return { icon: 'snow', label: 'Snow', color: '#e5e7eb' };
    if (code >= 95) return { icon: 'thunderstorm', label: 'Storm', color: '#f59e0b' };
    return { icon: 'cloud', label: 'Unknown', color: '#9ca3af' };
}

// AQI Color mapping
function getAqiInfo(aqi: number) {
    if (aqi <= 50) return { label: 'Good', color: '#22c55e' };
    if (aqi <= 100) return { label: 'Moderate', color: '#fbbf24' }; // yellow-ish
    if (aqi <= 150) return { label: 'Unhealthy for Sensitive', color: '#f97316' }; // orange
    if (aqi <= 200) return { label: 'Unhealthy', color: '#ef4444' }; // red
    if (aqi <= 300) return { label: 'Very Unhealthy', color: '#7f1d1d' }; // dark red
    return { label: 'Hazardous', color: '#7f1d1d' }; // maroon
}

export default function WeatherModal({ visible, onClose, data, locationName }: WeatherModalProps) {
    if (!data) return null;

    const currentInfo = getWeatherInfo(data.condition_code);
    const aqiInfo = getAqiInfo(data.aqi);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                {Platform.OS === 'ios' ? (
                    <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.85)' }]} />
                )}

                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.headerTitle}>Weather Forecast</Text>
                            <Text style={styles.headerLocation}>{locationName}</Text>
                        </View>
                        <View style={{ width: 40 }} />
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent}>
                        {/* Current Weather Card */}
                        <View style={styles.currentCard}>
                            <View style={styles.currentTop}>
                                <View>
                                    <Text style={styles.temp}>{Math.round(data.temp)}°{data.params.temp_unit}</Text>
                                    <Text style={styles.condition}>{currentInfo.label}</Text>
                                </View>
                                <Ionicons name={currentInfo.icon as any} size={64} color={currentInfo.color} />
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.aqiRow}>
                                <Text style={styles.aqiLabel}>Air Quality Index</Text>
                                <View style={[styles.aqiBadge, { backgroundColor: aqiInfo.color + '30', borderColor: aqiInfo.color }]}>
                                    <Text style={[styles.aqiValue, { color: aqiInfo.color }]}>{data.aqi}</Text>
                                    <Text style={[styles.aqiText, { color: aqiInfo.color }]}>{aqiInfo.label}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Forecast List */}
                        <Text style={styles.sectionTitle}>7-Day Forecast</Text>
                        <View style={styles.forecastList}>
                            {data.forecast.map((day, index) => {
                                const date = new Date(day.date);
                                const dayName = index === 0 ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' });
                                const info = getWeatherInfo(day.code);

                                return (
                                    <View key={day.date} style={styles.forecastItem}>
                                        <Text style={styles.dayText}>{dayName}</Text>

                                        <View style={styles.iconContainer}>
                                            <Ionicons name={info.icon as any} size={24} color={info.color} />
                                            {day.rain_prob > 0 && (
                                                <Text style={styles.rainText}>{day.rain_prob}%</Text>
                                            )}
                                        </View>

                                        <View style={styles.tempRange}>
                                            <Text style={styles.highTemp}>{Math.round(day.max_temp)}°</Text>
                                            <Text style={styles.lowTemp}>{Math.round(day.min_temp)}°</Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1f2937',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '80%',
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    closeBtn: {
        padding: 8,
        backgroundColor: '#374151',
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerLocation: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
    },
    scrollContent: {
        padding: 20,
    },
    currentCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#374151',
    },
    currentTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    temp: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
    },
    condition: {
        fontSize: 18,
        color: '#9ca3af',
        marginTop: 4,
    },
    divider: {
        height: 1,
        backgroundColor: '#374151',
        marginVertical: 16,
    },
    aqiRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    aqiLabel: {
        fontSize: 16,
        color: '#d1d5db',
    },
    aqiBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
    },
    aqiValue: {
        fontWeight: 'bold',
        marginRight: 6,
        fontSize: 16,
    },
    aqiText: {
        fontSize: 14,
        fontWeight: '500',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
    },
    forecastList: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 8,
        borderWidth: 1,
        borderColor: '#374151',
    },
    forecastItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    dayText: {
        width: 60,
        color: '#fff',
        fontWeight: '500',
        fontSize: 16,
    },
    iconContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 80,
    },
    rainText: {
        color: '#60a5fa',
        fontSize: 12,
        marginLeft: 4,
        fontWeight: 'bold',
    },
    tempRange: {
        flexDirection: 'row',
        width: 80,
        justifyContent: 'flex-end',
    },
    highTemp: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
        marginLeft: 12,
    },
    lowTemp: {
        color: '#9ca3af',
        fontSize: 16,
        marginLeft: 12,
    },
});
