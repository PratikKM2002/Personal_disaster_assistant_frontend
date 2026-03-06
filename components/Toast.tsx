import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- Types ---

type ToastType = 'error' | 'success' | 'warning' | 'info';

interface ToastMessage {
    id: number;
    type: ToastType;
    title: string;
    message?: string;
    duration?: number;
}

// --- Global event emitter (works from non-component code like api.ts) ---

type Listener = (toast: Omit<ToastMessage, 'id'>) => void;
let _listener: Listener | null = null;
let _id = 0;

/**
 * Show a toast from anywhere in the app (components, services, etc.)
 */
export function showToast(
    type: ToastType,
    title: string,
    message?: string,
    duration = 3500
) {
    if (_listener) {
        _listener({ type, title, message, duration });
    }
}

// --- Component ---

const ICONS: Record<ToastType, string> = {
    error: 'close-circle',
    success: 'checkmark-circle',
    warning: 'warning',
    info: 'information-circle',
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
    error: { bg: 'rgba(239, 68, 68, 0.95)', border: '#dc2626', icon: '#fff' },
    success: { bg: 'rgba(34, 197, 94, 0.95)', border: '#16a34a', icon: '#fff' },
    warning: { bg: 'rgba(245, 158, 11, 0.95)', border: '#d97706', icon: '#fff' },
    info: { bg: 'rgba(59, 130, 246, 0.95)', border: '#2563eb', icon: '#fff' },
};

export default function Toast() {
    const insets = useSafeAreaInsets();
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const slideAnims = useRef<Map<number, Animated.Value>>(new Map());

    // Register global listener
    useEffect(() => {
        _listener = (toast) => {
            const id = ++_id;
            setToasts(prev => [...prev, { ...toast, id }]);
        };
        return () => { _listener = null; };
    }, []);

    const dismiss = useCallback((id: number) => {
        const anim = slideAnims.current.get(id);
        if (anim) {
            Animated.timing(anim, {
                toValue: -120,
                duration: 250,
                useNativeDriver: true,
            }).start(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
                slideAnims.current.delete(id);
            });
        } else {
            setToasts(prev => prev.filter(t => t.id !== id));
        }
    }, []);

    if (toasts.length === 0) return null;

    return (
        <View style={[styles.container, { top: insets.top + 8 }]} pointerEvents="box-none">
            {toasts.map((toast) => (
                <ToastItem
                    key={toast.id}
                    toast={toast}
                    slideAnims={slideAnims}
                    onDismiss={dismiss}
                />
            ))}
        </View>
    );
}

function ToastItem({
    toast,
    slideAnims,
    onDismiss,
}: {
    toast: ToastMessage;
    slideAnims: React.MutableRefObject<Map<number, Animated.Value>>;
    onDismiss: (id: number) => void;
}) {
    const anim = useRef(new Animated.Value(-120)).current;

    useEffect(() => {
        slideAnims.current.set(toast.id, anim);

        Animated.spring(anim, {
            toValue: 0,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
        }).start();

        const timer = setTimeout(() => {
            onDismiss(toast.id);
        }, toast.duration || 3500);

        return () => clearTimeout(timer);
    }, []);

    const colors = COLORS[toast.type];

    return (
        <Animated.View
            style={[
                styles.toast,
                {
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    transform: [{ translateY: anim }],
                },
            ]}
        >
            <Ionicons
                name={ICONS[toast.type] as any}
                size={22}
                color={colors.icon}
                style={styles.icon}
            />
            <View style={styles.textContainer}>
                <Text style={styles.title} numberOfLines={1}>{toast.title}</Text>
                {toast.message && (
                    <Text style={styles.message} numberOfLines={2}>{toast.message}</Text>
                )}
            </View>
            <TouchableOpacity onPress={() => onDismiss(toast.id)} hitSlop={8}>
                <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        zIndex: 9999,
        elevation: 9999,
        gap: 8,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 12,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    icon: {
        marginRight: 10,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    message: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
    },
});
