import { getAlerts } from '@/services/api';
import * as Location from 'expo-location';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface AlertsContextType {
    unreadCount: number;
    refreshAlerts: () => Promise<void>;
    setUnreadCount: (count: number) => void;
}

const AlertsContext = createContext<AlertsContextType>({
    unreadCount: 0,
    refreshAlerts: async () => { },
    setUnreadCount: () => { },
});

export const useAlerts = () => useContext(AlertsContext);

export const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [unreadCount, setUnreadCount] = useState(0);
    const { isAuthenticated } = useAuth();

    const refreshAlerts = async () => {
        if (!isAuthenticated) return;
        try {
            // Try to get location for filtering
            let lat, lon;
            try {
                const { status } = await Location.getForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getLastKnownPositionAsync({}) || await Location.getCurrentPositionAsync({});
                    lat = loc.coords.latitude;
                    lon = loc.coords.longitude;
                }
            } catch (e) {
                // Ignore location errors, fallback to no filter
            }

            const alerts = await getAlerts(lat, lon, 500); // 500km radius
            setUnreadCount(alerts.length);
        } catch (error) {
            console.log('Failed to refresh alerts count', error);
        }
    };

    useEffect(() => {
        if (isAuthenticated) {
            // Delay the first fetch to let Clerk token settle
            const initialTimeout = setTimeout(async () => {
                try {
                    await refreshAlerts();
                } catch {
                    // If still failing, retry after another 2s
                    setTimeout(() => refreshAlerts().catch(() => {}), 2000);
                }
            }, 1500);
            // Poll every minute after that
            const interval = setInterval(refreshAlerts, 60000);
            return () => { clearTimeout(initialTimeout); clearInterval(interval); };
        } else {
            setUnreadCount(0);
        }
    }, [isAuthenticated]);

    return (
        <AlertsContext.Provider value={{ unreadCount, refreshAlerts, setUnreadCount }}>
            {children}
        </AlertsContext.Provider>
    );
};
