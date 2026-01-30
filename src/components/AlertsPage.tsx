import { useState } from 'react';
import { X, Bell, ChevronRight, Filter, MapPin, Clock } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

type AlertSeverity = 'critical' | 'warning' | 'advisory';
type AlertCategory = 'all' | 'weather' | 'evacuation' | 'safety' | 'community';

interface Alert {
    id: string;
    title: string;
    description: string;
    severity: AlertSeverity;
    category: string;
    location: string;
    timestamp: Date;
    isRead: boolean;
    actionLabel?: string;
    actionIcon?: string;
}

const ALERTS: Alert[] = [
    {
        id: '1',
        title: 'CRITICAL: Wildfire - Evacuate Zone B NOW',
        description: 'Mandatory evacuation order for Zone B. Fire spreading northeast at 15mph. Use Route 1 to Moscone Center shelter.',
        severity: 'critical',
        category: 'evacuation',
        location: 'Zone B - Mission District',
        timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
        isRead: false,
        actionLabel: 'Navigate to Shelter',
        actionIcon: '🧭',
    },
    {
        id: '2',
        title: 'Air Quality Alert: Unhealthy (AQI 180)',
        description: 'Smoke from nearby wildfire causing poor air quality. Limit outdoor activities. Wear N95 masks if going outside.',
        severity: 'warning',
        category: 'weather',
        location: 'San Francisco Bay Area',
        timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
        isRead: false,
    },
    {
        id: '3',
        title: 'Road Closure: Highway 101 Northbound',
        description: 'Highway 101 NB closed from Exit 432 to Exit 438 due to fire response operations. Use alternate routes.',
        severity: 'warning',
        category: 'safety',
        location: 'Highway 101',
        timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
        isRead: true,
    },
    {
        id: '4',
        title: 'Shelter Update: Moscone Center at 90% Capacity',
        description: 'Primary evacuation shelter nearing capacity. Oakland Convention Center activated as overflow location.',
        severity: 'advisory',
        category: 'community',
        location: 'Moscone Center',
        timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        isRead: true,
    },
    {
        id: '5',
        title: 'Power Outage: Pacific Heights Area',
        description: 'PG&E reports power outage affecting 2,500 customers. Estimated restoration: 4 hours.',
        severity: 'advisory',
        category: 'safety',
        location: 'Pacific Heights',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        isRead: true,
    },
    {
        id: '6',
        title: 'Flash Flood Watch',
        description: 'Flash flood watch in effect until 6 PM. Heavy rain expected in burn scar areas. Avoid low-lying areas.',
        severity: 'warning',
        category: 'weather',
        location: 'Embarcadero Waterfront',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        isRead: true,
    },
];

const CATEGORIES = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'weather', label: 'Weather', icon: '🌤️' },
    { id: 'evacuation', label: 'Evacuation', icon: '🚨' },
    { id: 'safety', label: 'Safety', icon: '⚠️' },
    { id: 'community', label: 'Community', icon: '👥' },
];

export function AlertsPage({ isOpen, onClose }: Props) {
    const [selectedCategory, setSelectedCategory] = useState<AlertCategory>('all');
    const [alerts, setAlerts] = useState(ALERTS);

    if (!isOpen) return null;

    const filteredAlerts = alerts.filter(a =>
        selectedCategory === 'all' || a.category === selectedCategory
    );

    const unreadCount = alerts.filter(a => !a.isRead).length;

    const markAsRead = (id: string) => {
        setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
    };

    const formatTime = (date: Date) => {
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    const getSeverityStyles = (severity: AlertSeverity) => {
        switch (severity) {
            case 'critical':
                return {
                    bg: 'bg-red-500/20',
                    border: 'border-red-500/50',
                    badge: 'bg-red-500 text-white',
                    icon: '🚨',
                };
            case 'warning':
                return {
                    bg: 'bg-orange-500/10',
                    border: 'border-orange-500/30',
                    badge: 'bg-orange-500 text-white',
                    icon: '⚠️',
                };
            case 'advisory':
                return {
                    bg: 'bg-blue-500/10',
                    border: 'border-blue-500/30',
                    badge: 'bg-blue-500 text-white',
                    icon: 'ℹ️',
                };
        }
    };

    return (
        <div className="fixed inset-0 bg-[#0d0d0d] z-50 flex flex-col">
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b border-white/10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg">
                            <X size={20} className="text-gray-400" />
                        </button>
                        <div>
                            <h1 className="text-lg font-bold text-white">Alerts</h1>
                            <p className="text-xs text-gray-500">{unreadCount} unread</p>
                        </div>
                    </div>
                    <button className="p-2 hover:bg-white/10 rounded-lg">
                        <Filter size={18} className="text-gray-400" />
                    </button>
                </div>

                {/* Category Pills */}
                <div className="flex gap-2 mt-3 overflow-x-auto hide-scrollbar">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id as AlertCategory)}
                            className={clsx(
                                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                                selectedCategory === cat.id
                                    ? "bg-white text-black"
                                    : "bg-white/10 text-gray-400 hover:bg-white/20"
                            )}
                        >
                            {typeof cat.icon === 'string' ? (
                                <span>{cat.icon}</span>
                            ) : (
                                <cat.icon size={12} />
                            )}
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Alerts List */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {filteredAlerts.map(alert => {
                    const styles = getSeverityStyles(alert.severity);
                    return (
                        <div
                            key={alert.id}
                            onClick={() => markAsRead(alert.id)}
                            className={clsx(
                                "p-3 rounded-xl border transition-all cursor-pointer",
                                styles.bg,
                                styles.border,
                                !alert.isRead && "ring-1 ring-white/20"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className="text-xl">{styles.icon}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={clsx(
                                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                            styles.badge
                                        )}>
                                            {alert.severity}
                                        </span>
                                        {!alert.isRead && (
                                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                                        )}
                                    </div>
                                    <p className="text-sm font-semibold text-white leading-tight">
                                        {alert.title}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                                        {alert.description}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                                        <span className="flex items-center gap-1">
                                            <MapPin size={10} />
                                            {alert.location}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock size={10} />
                                            {formatTime(alert.timestamp)}
                                        </span>
                                    </div>
                                    {alert.actionLabel && (
                                        <button className="mt-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-medium text-white flex items-center gap-1.5">
                                            {alert.actionIcon && <span>{alert.actionIcon}</span>}
                                            {alert.actionLabel}
                                            <ChevronRight size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredAlerts.length === 0 && (
                    <div className="text-center py-12">
                        <Bell size={40} className="text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 text-sm">No alerts in this category</p>
                    </div>
                )}
            </div>

            {/* Mark All Read Button */}
            {unreadCount > 0 && (
                <div className="shrink-0 px-4 py-3 border-t border-white/10">
                    <button
                        onClick={() => setAlerts(prev => prev.map(a => ({ ...a, isRead: true })))}
                        className="w-full py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-medium text-white"
                    >
                        Mark all as read
                    </button>
                </div>
            )}
        </div>
    );
}
