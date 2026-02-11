import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type NativeMapProps = {
    userLocation: { lat: number; lng: number };
    resources: any[];
    categoryColors: Record<string, string>;
};

export default function NativeMap(_props: NativeMapProps) {
    return (
        <View style={styles.placeholder}>
            <Ionicons name="map" size={50} color="#3b82f6" />
            <Text style={styles.text}>Map View</Text>
            <Text style={styles.subtext}>Open on mobile for interactive map</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 8,
    },
    subtext: {
        color: '#6b7280',
        fontSize: 12,
        marginTop: 4,
    },
});
