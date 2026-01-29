import { useState } from 'react';
import { X, Bell, MapPin, Shield, Moon, Globe, ChevronRight, LogOut, Camera, Edit2, Phone, Heart, Accessibility, Volume2, Vibrate } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface SettingToggle {
    id: string;
    label: string;
    description: string;
    enabled: boolean;
}

export function SettingsPage({ isOpen, onClose }: Props) {
    const [profile, setProfile] = useState({
        name: 'Pratik',
        email: 'pratik@example.com',
        phone: '+1 (555) 123-4567',
        location: 'San Francisco, CA',
    });

    const [notifications, setNotifications] = useState<SettingToggle[]>([
        { id: 'alerts', label: 'Emergency Alerts', description: 'Critical disaster warnings', enabled: true },
        { id: 'weather', label: 'Weather Updates', description: 'Daily forecasts and severe weather', enabled: true },
        { id: 'community', label: 'Community Updates', description: 'Neighbor check-ins and resources', enabled: false },
        { id: 'tips', label: 'Preparedness Tips', description: 'Weekly safety reminders', enabled: true },
    ]);

    const [accessibility, setAccessibility] = useState<SettingToggle[]>([
        { id: 'largeText', label: 'Large Text', description: 'Increase text size throughout app', enabled: false },
        { id: 'highContrast', label: 'High Contrast', description: 'Enhanced color contrast', enabled: false },
        { id: 'voiceover', label: 'Voice Guidance', description: 'Audio navigation assistance', enabled: true },
        { id: 'haptic', label: 'Haptic Feedback', description: 'Vibration for alerts', enabled: true },
    ]);

    const toggleNotification = (id: string) => {
        setNotifications(notifications.map(n =>
            n.id === id ? { ...n, enabled: !n.enabled } : n
        ));
    };

    const toggleAccessibility = (id: string) => {
        setAccessibility(accessibility.map(a =>
            a.id === id ? { ...a, enabled: !a.enabled } : a
        ));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
            <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-[#1c1c1e] border-b border-white/10 p-4 flex items-center justify-between z-10 shrink-0">
                    <h2 className="text-white font-bold text-lg">Settings</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <X size={18} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-4 space-y-6">
                    {/* Profile Section */}
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-2xl font-bold text-white">
                                    {profile.name.charAt(0)}
                                </div>
                                <button className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#1c1c1e]">
                                    <Camera size={12} className="text-white" />
                                </button>
                            </div>
                            <div className="flex-1">
                                <h3 className="text-white font-semibold text-lg">{profile.name}</h3>
                                <p className="text-gray-400 text-sm">{profile.email}</p>
                                <div className="flex items-center gap-1 mt-1">
                                    <MapPin size={12} className="text-gray-500" />
                                    <span className="text-gray-500 text-xs">{profile.location}</span>
                                </div>
                            </div>
                            <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                                <Edit2 size={18} className="text-gray-400" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="p-3 bg-white/5 rounded-xl">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                                <p className="text-sm text-white mt-0.5">{profile.phone}</p>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl">
                                <p className="text-xs text-gray-500 uppercase tracking-wider">Blood Type</p>
                                <p className="text-sm text-white mt-0.5">O+</p>
                            </div>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div>
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                            <Bell size={14} />
                            Notifications
                        </h3>
                        <div className="space-y-2">
                            {notifications.map((setting) => (
                                <div
                                    key={setting.id}
                                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
                                >
                                    <div className="flex-1">
                                        <p className="text-white font-medium text-sm">{setting.label}</p>
                                        <p className="text-gray-500 text-xs mt-0.5">{setting.description}</p>
                                    </div>
                                    <button
                                        onClick={() => toggleNotification(setting.id)}
                                        className={clsx(
                                            "w-12 h-7 rounded-full transition-all relative",
                                            setting.enabled ? "bg-green-500" : "bg-gray-600"
                                        )}
                                    >
                                        <div className={clsx(
                                            "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md",
                                            setting.enabled ? "left-6" : "left-1"
                                        )} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Accessibility */}
                    <div>
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 flex items-center gap-2">
                            <Accessibility size={14} />
                            Accessibility
                        </h3>
                        <div className="space-y-2">
                            {accessibility.map((setting) => (
                                <div
                                    key={setting.id}
                                    className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
                                            {setting.id === 'largeText' && <span className="text-white text-lg font-bold">A</span>}
                                            {setting.id === 'highContrast' && <Moon size={16} className="text-white" />}
                                            {setting.id === 'voiceover' && <Volume2 size={16} className="text-white" />}
                                            {setting.id === 'haptic' && <Vibrate size={16} className="text-white" />}
                                        </div>
                                        <div>
                                            <p className="text-white font-medium text-sm">{setting.label}</p>
                                            <p className="text-gray-500 text-xs">{setting.description}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => toggleAccessibility(setting.id)}
                                        className={clsx(
                                            "w-12 h-7 rounded-full transition-all relative",
                                            setting.enabled ? "bg-blue-500" : "bg-gray-600"
                                        )}
                                    >
                                        <div className={clsx(
                                            "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md",
                                            setting.enabled ? "left-6" : "left-1"
                                        )} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3">Quick Links</h3>
                        <div className="space-y-2">
                            {[
                                { icon: <Heart size={18} />, label: 'Emergency Contacts', color: 'text-red-400' },
                                { icon: <Shield size={18} />, label: 'Privacy & Security', color: 'text-green-400' },
                                { icon: <Globe size={18} />, label: 'Language', value: 'English', color: 'text-blue-400' },
                                { icon: <Phone size={18} />, label: 'Help & Support', color: 'text-purple-400' },
                            ].map((item, i) => (
                                <button
                                    key={i}
                                    className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={item.color}>{item.icon}</span>
                                        <span className="text-white text-sm">{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.value && <span className="text-gray-500 text-sm">{item.value}</span>}
                                        <ChevronRight size={18} className="text-gray-500" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* App Info */}
                    <div className="text-center py-4 space-y-2">
                        <p className="text-gray-500 text-xs">Guardian AI v1.0.0</p>
                        <p className="text-gray-600 text-xs">Made with ❤️ for community safety</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                    <button className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 font-medium flex items-center justify-center gap-2 transition-colors">
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
}
