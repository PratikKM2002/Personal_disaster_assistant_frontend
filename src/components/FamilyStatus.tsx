import { useState, useEffect, useRef } from 'react';
import { X, Check, AlertCircle, Clock, MapPin, Phone, RefreshCw, Send, Users, ChevronRight, Map, MessageCircle, Battery, BatteryLow, BatteryMedium, BatteryFull, BatteryCharging, Wifi, WifiOff, ChevronLeft, ChevronDown, ChevronUp, History } from 'lucide-react';
import clsx from 'clsx';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface FamilyMember {
    id: string;
    name: string;
    avatar?: string;
    status: 'safe' | 'danger' | 'pending' | 'unknown';
    lastUpdate: string;
    location?: string;
    phone: string;
    coordinates?: [number, number]; // [lng, lat]
    batteryLevel?: number;
    isOnline?: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const MOCK_FAMILY: FamilyMember[] = [
    {
        id: '1',
        name: 'Sarah',
        status: 'safe',
        lastUpdate: '2 min ago',
        location: 'Home',
        phone: '+1 555-1234',
        coordinates: [-122.4194, 37.7749], // SF
        batteryLevel: 85,
        isOnline: true
    },
    {
        id: '2',
        name: 'Michael',
        status: 'pending',
        lastUpdate: '15 min ago',
        location: 'Downtown',
        phone: '+1 555-5678',
        coordinates: [-122.4074, 37.7849],
        batteryLevel: 42,
        isOnline: true
    },
    {
        id: '3',
        name: 'Mom',
        status: 'safe',
        lastUpdate: '5 min ago',
        location: 'Work',
        phone: '+1 555-9012',
        coordinates: [-122.4294, 37.7649],
        batteryLevel: 92,
        isOnline: true
    },
    {
        id: '4',
        name: 'Dad',
        status: 'unknown',
        lastUpdate: '1 hour ago',
        phone: '+1 555-3456',
        coordinates: [-122.4394, 37.7549],
        batteryLevel: 15,
        isOnline: false
    },
    {
        id: '5',
        name: 'Emma',
        status: 'safe',
        lastUpdate: 'Just now',
        location: 'School',
        phone: '+1 555-7890',
        coordinates: [-122.4094, 37.7949],
        batteryLevel: 68,
        isOnline: true
    },
];

const statusConfig = {
    safe: {
        icon: Check,
        color: 'text-green-400',
        bg: 'bg-green-500/20',
        border: 'border-green-500/30',
        label: 'Safe',
        markerColor: '#22c55e'
    },
    danger: {
        icon: AlertCircle,
        color: 'text-red-400',
        bg: 'bg-red-500/20',
        border: 'border-red-500/30',
        label: 'Needs Help',
        markerColor: '#ef4444'
    },
    pending: {
        icon: Clock,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/20',
        border: 'border-yellow-500/30',
        label: 'Checking In...',
        markerColor: '#eab308'
    },
    unknown: {
        icon: AlertCircle,
        color: 'text-gray-400',
        bg: 'bg-gray-500/20',
        border: 'border-gray-500/30',
        label: 'No Response',
        markerColor: '#6b7280'
    },
};

type ViewType = 'list' | 'map' | 'group-text' | 'manage';

interface GroupMessage {
    id: string;
    text: string;
    timestamp: Date;
    sender?: string; // If undefined, it's from "You"
    recipients?: string[];
    status: 'sent' | 'delivered' | 'read';
    isIncoming?: boolean;
}

const INITIAL_MESSAGES: GroupMessage[] = [
    {
        id: 'init-1',
        text: "I'm at the evacuation center now. It's safe here!",
        timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
        sender: 'Mom',
        status: 'read',
        isIncoming: true
    },
    {
        id: 'init-2',
        text: "Heading to the shelter now. Traffic is bad on Market St.",
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 min ago
        sender: 'Sarah',
        status: 'read',
        isIncoming: true
    },
    {
        id: 'init-3',
        text: "Has anyone heard from Dad? He's not responding.",
        timestamp: new Date(Date.now() - 1000 * 60 * 20), // 20 min ago
        sender: 'Michael',
        status: 'read',
        isIncoming: true
    },
    {
        id: 'init-4',
        text: "School is evacuating us to Moscone Center",
        timestamp: new Date(Date.now() - 1000 * 60 * 10), // 10 min ago
        sender: 'Emma',
        status: 'read',
        isIncoming: true
    },
];

export function FamilyStatus({ isOpen, onClose }: Props) {
    const [family, setFamily] = useState<FamilyMember[]>(MOCK_FAMILY);
    const [myStatus, setMyStatus] = useState<'safe' | 'danger' | null>(null);
    const [currentView, setCurrentView] = useState<ViewType>('list');
    const [groupMessage, setGroupMessage] = useState('');
    const [messageHistory, setMessageHistory] = useState<GroupMessage[]>(INITIAL_MESSAGES);
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [showQuickMessages, setShowQuickMessages] = useState(true);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);

    const safeCount = family.filter(m => m.status === 'safe').length;
    const needsAttention = family.filter(m => m.status === 'danger' || m.status === 'unknown').length;

    // Initialize map when switching to map view
    useEffect(() => {
        if (currentView === 'map' && mapContainerRef.current && !mapRef.current) {
            mapRef.current = new maplibregl.Map({
                container: mapContainerRef.current,
                style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
                center: [-122.4194, 37.7749],
                zoom: 12
            });

            mapRef.current.addControl(new maplibregl.NavigationControl(), 'top-right');

            // Add markers for family members
            mapRef.current.on('load', () => {
                addFamilyMarkers();
            });
        }

        // Cleanup function when view changes or component unmounts
        return () => {
            if (mapRef.current) {
                // Clean up markers
                markersRef.current.forEach(marker => marker.remove());
                markersRef.current = [];

                // Destroy the map instance
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [currentView]);

    const addFamilyMarkers = () => {
        if (!mapRef.current) return;

        // Clear existing markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        const bounds = new maplibregl.LngLatBounds();

        family.forEach(member => {
            if (member.coordinates) {
                const config = statusConfig[member.status];

                // Create custom marker element
                const el = document.createElement('div');
                el.className = 'family-marker';
                el.innerHTML = `
                    <div style="
                        width: 48px;
                        height: 48px;
                        background: ${config.markerColor};
                        border: 3px solid white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        color: white;
                        font-size: 18px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                        position: relative;
                    ">
                        ${member.name.charAt(0)}
                        <div style="
                            position: absolute;
                            bottom: -4px;
                            right: -4px;
                            width: 16px;
                            height: 16px;
                            background: ${member.isOnline ? '#22c55e' : '#6b7280'};
                            border: 2px solid white;
                            border-radius: 50%;
                        "></div>
                    </div>
                `;

                const marker = new maplibregl.Marker({ element: el })
                    .setLngLat(member.coordinates)
                    .setPopup(
                        new maplibregl.Popup({ offset: [0, -25], closeButton: true, className: 'family-popup' })
                            .setHTML(`
                                <div style="padding: 8px; min-width: 160px;">
                                    <div style="font-weight: bold; font-size: 13px; color: #333;">${member.name}</div>
                                    <div style="color: ${config.markerColor}; font-size: 11px; font-weight: 500; margin-bottom: 6px;">${config.label}</div>
                                    
                                    <div style="display: flex; flex-wrap: wrap; gap: 4px; font-size: 9px; color: #666; margin-bottom: 8px;">
                                        ${member.location ? `<span style="background: #f3f4f6; padding: 2px 5px; border-radius: 4px;">📍${member.location}</span>` : ''}
                                        <span style="background: #f3f4f6; padding: 2px 5px; border-radius: 4px;">🔋${member.batteryLevel}%</span>
                                        <span style="background: ${member.isOnline ? '#dcfce7' : '#f3f4f6'}; padding: 2px 5px; border-radius: 4px;">${member.isOnline ? '🟢' : '⚫'}</span>
                                    </div>
                                    
                                    <div style="display: flex; gap: 4px;">
                                        <a 
                                            href="https://www.google.com/maps/dir/?api=1&destination=${member.coordinates[1]},${member.coordinates[0]}"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style="
                                                flex: 1;
                                                display: flex;
                                                align-items: center;
                                                justify-content: center;
                                                padding: 6px;
                                                background: linear-gradient(135deg, #8b5cf6, #6366f1);
                                                color: white;
                                                font-size: 10px;
                                                font-weight: 600;
                                                border-radius: 6px;
                                                text-decoration: none;
                                            "
                                        >🧭 Navigate</a>
                                        <a 
                                            href="tel:${member.phone}"
                                            style="padding: 6px 8px; background: #22c55e; color: white; border-radius: 6px; text-decoration: none; font-size: 10px;"
                                        >📞</a>
                                        <a 
                                            href="sms:${member.phone}"
                                            style="padding: 6px 8px; background: #3b82f6; color: white; border-radius: 6px; text-decoration: none; font-size: 10px;"
                                        >💬</a>
                                    </div>
                                </div>
                            `)
                    )
                    .addTo(mapRef.current!);

                markersRef.current.push(marker);
                bounds.extend(member.coordinates);
            }
        });

        // Fit map to show all markers
        if (markersRef.current.length > 0) {
            mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
        }
    };

    const handleRequestCheckIn = (id: string) => {
        setFamily(family.map(m =>
            m.id === id ? { ...m, status: 'pending', lastUpdate: 'Just now' } : m
        ));
        showSuccessNotification('Check-in request sent');
    };

    const handleRequestAllCheckIn = () => {
        setFamily(family.map(m =>
            m.status !== 'safe' ? { ...m, status: 'pending', lastUpdate: 'Just now' } : m
        ));
        showSuccessNotification('Check-in request sent to all');
    };

    const handleMarkMySafe = () => {
        setMyStatus('safe');
        showSuccessNotification('Your status has been shared with family');
    };

    const handleSendGroupText = () => {
        if (!groupMessage.trim()) return;

        const newMessage: GroupMessage = {
            id: Date.now().toString(),
            text: groupMessage.trim(),
            timestamp: new Date(),
            recipients: family.map(m => m.name),
            status: 'sent'
        };

        setMessageHistory([newMessage, ...messageHistory]);
        showSuccessNotification(`Group message sent to ${family.length} family members`);
        setGroupMessage('');

        // Simulate message delivery after 1 second
        setTimeout(() => {
            setMessageHistory(prev => prev.map(m =>
                m.id === newMessage.id ? { ...m, status: 'delivered' } : m
            ));
        }, 1000);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatDate = (date: Date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === yesterday.toDateString()) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const showSuccessNotification = (message: string) => {
        setSuccessMessage(message);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            setSuccessMessage('');
        }, 2000);
    };

    const getBatteryIcon = (level?: number) => {
        if (!level) return <Battery size={14} className="text-gray-400" />;
        if (level <= 20) return <BatteryLow size={14} className="text-red-400" />;
        if (level <= 50) return <BatteryMedium size={14} className="text-yellow-400" />;
        if (level <= 80) return <BatteryFull size={14} className="text-green-400" />;
        return <BatteryCharging size={14} className="text-green-400" />;
    };

    if (!isOpen) return null;

    // Group Text View
    if (currentView === 'group-text') {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
                <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentView('list')}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft size={18} className="text-white" />
                            </button>
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <MessageCircle size={20} className="text-white" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-white font-bold text-lg">Group Text</h2>
                                <p className="text-white/70 text-xs">Send to {family.length} family members</p>
                            </div>
                            {messageHistory.length > 0 && (
                                <div className="bg-white/20 px-2 py-1 rounded-full">
                                    <span className="text-white text-xs font-medium">{messageHistory.length} sent</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {/* Recipients - Compact */}
                        <div className="px-4 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">To:</span>
                                {family.map(member => (
                                    <div
                                        key={member.id}
                                        className={clsx(
                                            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2",
                                            statusConfig[member.status].border,
                                            statusConfig[member.status].bg,
                                            statusConfig[member.status].color
                                        )}
                                        title={member.name}
                                    >
                                        {member.name.charAt(0)}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Message History - Always Visible */}
                        <div className="p-4 border-b border-white/10">
                            <div className="flex items-center gap-2 mb-3">
                                <History size={16} className="text-blue-400" />
                                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold">Message History</p>
                                {messageHistory.length > 0 && (
                                    <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">
                                        {messageHistory.length}
                                    </span>
                                )}
                            </div>

                            {messageHistory.length === 0 ? (
                                <div className="text-center py-6 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <MessageCircle size={32} className="text-gray-600 mx-auto mb-2" />
                                    <p className="text-gray-500 text-sm">No messages sent yet</p>
                                    <p className="text-gray-600 text-xs mt-1">Your messages will appear here</p>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                                    {[...messageHistory].reverse().map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={clsx(
                                                "p-3 max-w-[85%]",
                                                msg.isIncoming
                                                    ? "bg-white/10 border border-white/10 rounded-2xl rounded-bl-md mr-auto"
                                                    : "bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-2xl rounded-br-md ml-auto"
                                            )}
                                        >
                                            {msg.isIncoming && (
                                                <p className="text-xs font-semibold text-purple-400 mb-1">{msg.sender}</p>
                                            )}
                                            <p className="text-white text-sm">{msg.text}</p>
                                            <div className="flex items-center justify-between mt-2 gap-2">
                                                {msg.isIncoming ? (
                                                    <span className="text-gray-500 text-xs">
                                                        {formatDate(msg.timestamp)} {formatTime(msg.timestamp)}
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="text-blue-300/70 text-xs">
                                                            To: {msg.recipients?.length || 0} members
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-gray-500 text-xs">
                                                                {formatDate(msg.timestamp)} {formatTime(msg.timestamp)}
                                                            </span>
                                                            {msg.status === 'sent' && (
                                                                <Check size={12} className="text-gray-400" />
                                                            )}
                                                            {msg.status === 'delivered' && (
                                                                <div className="flex">
                                                                    <Check size={12} className="text-blue-400 -mr-1" />
                                                                    <Check size={12} className="text-blue-400" />
                                                                </div>
                                                            )}
                                                            {msg.status === 'read' && (
                                                                <div className="flex">
                                                                    <Check size={12} className="text-green-400 -mr-1" />
                                                                    <Check size={12} className="text-green-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quick Messages - Collapsible */}
                        <div className="border-b border-white/10">
                            <button
                                onClick={() => setShowQuickMessages(!showQuickMessages)}
                                className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Quick Messages</span>
                                {showQuickMessages ? (
                                    <ChevronUp size={16} className="text-gray-500" />
                                ) : (
                                    <ChevronDown size={16} className="text-gray-500" />
                                )}
                            </button>
                            {showQuickMessages && (
                                <div className="px-4 pb-3 flex flex-wrap gap-2">
                                    {[
                                        'Everyone check in now!',
                                        "I'm safe, are you?",
                                        'Meet at the shelter',
                                        'Stay where you are',
                                        'Call me ASAP',
                                        'Evacuating now'
                                    ].map((msg) => (
                                        <button
                                            key={msg}
                                            onClick={() => setGroupMessage(msg)}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-white transition-colors"
                                        >
                                            {msg}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="p-4">
                            <textarea
                                value={groupMessage}
                                onChange={(e) => setGroupMessage(e.target.value)}
                                placeholder="Type your message to all family members..."
                                rows={3}
                                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                            />
                        </div>
                    </div>

                    {/* Send Button */}
                    <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                        <button
                            onClick={handleSendGroupText}
                            disabled={!groupMessage.trim()}
                            className={clsx(
                                "w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all",
                                groupMessage.trim()
                                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            <Send size={18} />
                            Send Group Text
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Map View
    if (currentView === 'map') {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
                <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] border border-white/10 shadow-2xl flex flex-col overflow-visible">
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 p-4 z-10 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentView('list')}
                                    className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                >
                                    <ChevronLeft size={18} className="text-white" />
                                </button>
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                    <Map size={20} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-white font-bold text-lg">Family Map</h2>
                                    <p className="text-white/70 text-xs">{family.filter(m => m.coordinates).length} members located</p>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex gap-3 mt-3 overflow-x-auto hide-scrollbar">
                            {Object.entries(statusConfig).map(([key, config]) => (
                                <div key={key} className="flex items-center gap-1.5 whitespace-nowrap">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: config.markerColor }}
                                    />
                                    <span className="text-white/70 text-xs">{config.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Map Container */}
                    <div
                        ref={mapContainerRef}
                        className="flex-1 min-h-[300px]"
                        style={{ height: '400px' }}
                    />

                    {/* Family Quick Status */}
                    <div className="px-4 py-3 border-t border-white/10 overflow-x-auto">
                        <div className="flex gap-2">
                            {family.map(member => {
                                const config = statusConfig[member.status];
                                return (
                                    <button
                                        key={member.id}
                                        onClick={() => {
                                            if (member.coordinates && mapRef.current) {
                                                mapRef.current.flyTo({
                                                    center: member.coordinates,
                                                    zoom: 15
                                                });
                                                // Open popup
                                                const marker = markersRef.current.find((_, i) => family[i].id === member.id);
                                                marker?.togglePopup();
                                            }
                                        }}
                                        className={clsx(
                                            "flex flex-col items-center gap-1 p-2 rounded-xl min-w-[60px] transition-colors",
                                            config.bg, "hover:bg-white/10"
                                        )}
                                    >
                                        <div className={clsx(
                                            "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 relative",
                                            config.border, config.color
                                        )}>
                                            {member.name.charAt(0)}
                                            <div className={clsx(
                                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-[#1c1c1e]",
                                                member.isOnline ? "bg-green-500" : "bg-gray-500"
                                            )} />
                                        </div>
                                        <span className="text-white text-xs">{member.name.split(' ')[0]}</span>
                                        <div className="flex items-center gap-1">
                                            {getBatteryIcon(member.batteryLevel)}
                                            <span className="text-gray-400 text-[10px]">{member.batteryLevel}%</span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                        <button
                            onClick={() => setCurrentView('group-text')}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
                        >
                            <MessageCircle size={18} />
                            Send Group Text
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main List View
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
            <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                {/* Success Toast */}
                {showSuccess && (
                    <div className="absolute top-4 left-4 right-4 z-50 p-3 bg-green-500/90 rounded-xl flex items-center gap-3 animate-pulse">
                        <Check size={20} className="text-white" />
                        <p className="text-white font-medium">{successMessage}</p>
                    </div>
                )}

                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-indigo-600 p-4 z-10 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Users size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Family Status</h2>
                                <p className="text-white/70 text-xs">{safeCount} of {family.length} confirmed safe</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* View Toggle */}
                            <button
                                onClick={() => setCurrentView('map')}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                                title="View on Map"
                            >
                                <Map size={16} className="text-white" />
                            </button>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <X size={18} className="text-white" />
                            </button>
                        </div>
                    </div>

                    {/* My Status */}
                    {!myStatus && (
                        <div className="mt-4 p-3 bg-white/10 rounded-xl">
                            <p className="text-white/80 text-sm mb-2">Let your family know you're okay:</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleMarkMySafe}
                                    className="flex-1 py-2.5 bg-green-500 hover:bg-green-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Check size={18} />
                                    I'm Safe
                                </button>
                                <button
                                    onClick={() => setMyStatus('danger')}
                                    className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <AlertCircle size={18} />
                                    Need Help
                                </button>
                            </div>
                        </div>
                    )}

                    {myStatus === 'safe' && (
                        <div className="mt-4 p-3 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3">
                            <Check size={20} className="text-green-400" />
                            <p className="text-green-300 text-sm font-medium">You've marked yourself as safe</p>
                        </div>
                    )}
                </div>

                {/* Status Summary */}
                {needsAttention > 0 && (
                    <div className="px-4 py-3 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <AlertCircle size={18} className="text-orange-400" />
                            <p className="text-orange-300 text-sm">{needsAttention} member(s) need attention</p>
                        </div>
                        <button
                            onClick={handleRequestAllCheckIn}
                            className="text-orange-400 text-sm font-medium flex items-center gap-1 hover:text-orange-300"
                        >
                            <RefreshCw size={14} />
                            Request All
                        </button>
                    </div>
                )}

                {/* Family List */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {family.map((member) => {
                        const config = statusConfig[member.status];
                        const StatusIcon = config.icon;

                        return (
                            <div
                                key={member.id}
                                className={clsx(
                                    "p-4 rounded-2xl border transition-all",
                                    config.bg,
                                    config.border
                                )}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2 relative",
                                        member.status === 'safe' ? "bg-green-500/30 border-green-500 text-green-300" :
                                            member.status === 'danger' ? "bg-red-500/30 border-red-500 text-red-300" :
                                                member.status === 'pending' ? "bg-yellow-500/30 border-yellow-500 text-yellow-300" :
                                                    "bg-gray-500/30 border-gray-500 text-gray-300"
                                    )}>
                                        {member.name.charAt(0)}
                                        {/* Online indicator */}
                                        <div className={clsx(
                                            "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#1c1c1e]",
                                            member.isOnline ? "bg-green-500" : "bg-gray-500"
                                        )} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-semibold">{member.name}</h3>
                                            <span className={clsx("text-xs font-medium", config.color)}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-gray-400 text-xs flex items-center gap-1">
                                                <Clock size={12} />
                                                {member.lastUpdate}
                                            </span>
                                            {member.location && (
                                                <span className="text-gray-400 text-xs flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {member.location}
                                                </span>
                                            )}
                                        </div>
                                        {/* Phone Status Row */}
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-gray-500 text-xs flex items-center gap-1">
                                                {getBatteryIcon(member.batteryLevel)}
                                                {member.batteryLevel}%
                                            </span>
                                            <span className="text-gray-500 text-xs flex items-center gap-1">
                                                {member.isOnline ? (
                                                    <><Wifi size={12} className="text-green-400" /> Online</>
                                                ) : (
                                                    <><WifiOff size={12} className="text-gray-400" /> Offline</>
                                                )}
                                            </span>
                                        </div>
                                    </div>
                                    <StatusIcon size={24} className={config.color} />
                                </div>

                                {(member.status === 'unknown' || member.status === 'pending') && (
                                    <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                                        <button
                                            onClick={() => window.location.href = `tel:${member.phone}`}
                                            className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Phone size={16} />
                                            Call
                                        </button>
                                        {member.status !== 'pending' && (
                                            <button
                                                onClick={() => handleRequestCheckIn(member.id)}
                                                className="flex-1 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl text-blue-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Send size={16} />
                                                Request Check-in
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 space-y-2 shrink-0">
                    <div className="flex gap-2">
                        <button
                            onClick={handleRequestAllCheckIn}
                            className="flex-1 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
                        >
                            <Send size={18} />
                            Request Everyone to Check In
                        </button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setCurrentView('group-text')}
                            className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <MessageCircle size={16} />
                            Group Text
                        </button>
                        <button
                            onClick={() => setCurrentView('map')}
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            <Map size={16} />
                            View Map
                        </button>
                    </div>
                    <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
                        <Users size={16} />
                        Manage Family Members
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
