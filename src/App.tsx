import { useState } from 'react';
import { Menu, Shield, Wifi, Battery, Signal, Settings, Users, Package, Home, Map, Bell, User, Heart, FileText, Share2 } from 'lucide-react';
import { RealMap } from './components/RealMap';
import { NavigationPanel } from './components/NavigationPanel';
import { EmergencyContacts } from './components/EmergencyContacts';
import { FamilyStatus } from './components/FamilyStatus';
import { ChatBot } from './components/ChatBot';
import { EmergencyKit } from './components/EmergencyKit';
import { SettingsPage } from './components/SettingsPage';
import { NeighborNetwork } from './components/NeighborNetwork';
import { ResourceSharing } from './components/ResourceSharing';
import { NearbyResources } from './components/NearbyResources';
import { SidebarDrawer } from './components/SidebarDrawer';
import { AlertsPage } from './components/AlertsPage';
import { WeatherWidget } from './components/WeatherWidget';
import { DocumentVault } from './components/DocumentVault';

type TabType = 'home' | 'map' | 'alerts' | 'community' | 'profile';

interface NavigationDestination {
    coordinates: [number, number];
    name: string;
    icon?: string;
}

function App() {
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const [isNavigating, setIsNavigating] = useState(false);
    const [navigationDestination, setNavigationDestination] = useState<NavigationDestination | null>(null);

    // Modal states
    const [showContacts, setShowContacts] = useState(false);
    const [showFamily, setShowFamily] = useState(false);
    const [showKit, setShowKit] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showNeighbors, setShowNeighbors] = useState(false);
    const [showResources, setShowResources] = useState(false);
    const [showNearbyResources, setShowNearbyResources] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const [showAlerts, setShowAlerts] = useState(false);
    const [showDocuments, setShowDocuments] = useState(false);

    // Handle sidebar navigation
    const handleSidebarNavigate = (screen: string) => {
        switch (screen) {
            case 'home': setActiveTab('home'); break;
            case 'map': setShowNearbyResources(true); break;
            case 'alerts': setShowAlerts(true); break;
            case 'sos': setShowContacts(true); break;
            case 'family': setShowFamily(true); break;
            case 'nearby-resources': setShowNearbyResources(true); break;
            case 'neighbors': setShowNeighbors(true); break;
            case 'resources': setShowResources(true); break;
            case 'kit': setShowKit(true); break;
            case 'documents': setShowDocuments(true); break;
            case 'settings': setShowSettings(true); break;
            case 'profile': setShowSettings(true); break;
            default: break;
        }
    };

    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="w-full h-full flex flex-col bg-[#0d0d0d] text-white relative">

            {/* Navigation Overlay - uses OSRM for real street routing */}
            <NavigationPanel
                isActive={isNavigating}
                onClose={() => { setIsNavigating(false); setNavigationDestination(null); }}
                destination={navigationDestination || undefined}
            />

            {/* Sidebar Drawer */}
            <SidebarDrawer
                isOpen={showSidebar}
                onClose={() => setShowSidebar(false)}
                onNavigate={handleSidebarNavigate}
            />

            {/* Modals */}
            <EmergencyContacts isOpen={showContacts} onClose={() => setShowContacts(false)} />
            <FamilyStatus isOpen={showFamily} onClose={() => setShowFamily(false)} />
            <EmergencyKit isOpen={showKit} onClose={() => setShowKit(false)} />
            <SettingsPage isOpen={showSettings} onClose={() => setShowSettings(false)} />
            <NeighborNetwork isOpen={showNeighbors} onClose={() => setShowNeighbors(false)} />
            <ResourceSharing isOpen={showResources} onClose={() => setShowResources(false)} />
            <AlertsPage
                isOpen={showAlerts}
                onClose={() => setShowAlerts(false)}
                onNavigate={(dest) => {
                    setNavigationDestination(dest);
                    setIsNavigating(true);
                }}
            />
            <DocumentVault isOpen={showDocuments} onClose={() => setShowDocuments(false)} />
            {showNearbyResources && (
                <NearbyResources
                    onClose={() => setShowNearbyResources(false)}
                    onNavigate={(dest) => {
                        setNavigationDestination(dest);
                        setIsNavigating(true);
                        setShowNearbyResources(false);
                    }}
                />
            )}

            {/* Status Bar */}
            <div className="flex items-center justify-between px-6 py-2 text-xs shrink-0">
                <span className="font-medium">{currentTime}</span>
                <div className="flex items-center gap-1">
                    <Signal size={14} />
                    <Wifi size={14} />
                    <Battery size={14} />
                </div>
            </div>

            {/* Header */}
            <header className="flex items-center justify-between px-5 py-2 shrink-0">
                <button
                    onClick={() => setShowSidebar(true)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                    <Menu size={20} className="text-gray-400" />
                </button>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                        <Shield size={16} className="text-white" />
                        <span className="font-semibold">Guardian AI</span>
                    </div>
                    <span className="text-[10px] text-gray-500">San Francisco, CA</span>
                </div>
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                    <Settings size={20} className="text-gray-400" />
                </button>
            </header>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-2.5">

                {/* Alert Banner - clickable to open AlertsPage */}
                <button
                    onClick={() => setShowAlerts(true)}
                    className="w-full text-left bg-gradient-to-r from-red-800 to-red-900 rounded-xl p-3 border border-red-700/50 hover:from-red-700 hover:to-red-800 transition-colors"
                >
                    <p className="text-white font-bold text-sm">⚠️ CRITICAL: Wildfire - Evacuate Zone B NOW</p>
                    <p className="text-red-200/80 text-xs mt-1">Tap to see all alerts • Last update: 2 minutes ago</p>
                </button>

                {/* Weather Widget */}
                <WeatherWidget />

                {/* Quick Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAlerts(true)}
                        className="flex-1 bg-orange-900/40 border border-orange-700/30 rounded-lg p-2.5 text-left hover:bg-orange-900/60 transition-colors"
                    >
                        <p className="text-[9px] text-orange-400 font-bold uppercase">3 Active Alerts</p>
                        <p className="text-[11px] text-white/80 mt-0.5">Wildfire, AQI, Road Closure</p>
                    </button>
                    <button
                        onClick={() => setShowContacts(true)}
                        className="bg-red-600 hover:bg-red-700 rounded-lg px-3 flex items-center gap-1.5 transition-colors"
                    >
                        <span>📞</span>
                        <span className="text-[10px] font-bold text-white">911</span>
                    </button>
                </div>

                {/* Map */}
                <div className="rounded-xl overflow-hidden h-56">
                    <RealMap onNavigate={(dest) => {
                        if (dest) {
                            setNavigationDestination(dest);
                            setIsNavigating(true);
                        } else {
                            setShowNearbyResources(true);
                        }
                    }} />
                </div>

                {/* Feature Grid */}
                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={() => setShowFamily(true)}
                        className="bg-purple-900/40 hover:bg-purple-900/60 border border-purple-700/30 rounded-xl p-3 flex flex-col items-center gap-1.5 transition-colors"
                    >
                        <div className="w-8 h-8 bg-purple-500/30 rounded-lg flex items-center justify-center">
                            <Users size={16} className="text-purple-400" />
                        </div>
                        <span className="text-[9px] text-purple-300 font-medium">Family</span>
                    </button>
                    <button
                        onClick={() => setShowKit(true)}
                        className="bg-amber-900/40 hover:bg-amber-900/60 border border-amber-700/30 rounded-xl p-3 flex flex-col items-center gap-1.5 transition-colors"
                    >
                        <div className="w-8 h-8 bg-amber-500/30 rounded-lg flex items-center justify-center">
                            <Package size={16} className="text-amber-400" />
                        </div>
                        <span className="text-[9px] text-amber-300 font-medium">Kit</span>
                    </button>
                    <button
                        onClick={() => setShowNeighbors(true)}
                        className="bg-teal-900/40 hover:bg-teal-900/60 border border-teal-700/30 rounded-xl p-3 flex flex-col items-center gap-1.5 transition-colors"
                    >
                        <div className="w-8 h-8 bg-teal-500/30 rounded-lg flex items-center justify-center">
                            <Heart size={16} className="text-teal-400" />
                        </div>
                        <span className="text-[9px] text-teal-300 font-medium">Neighbors</span>
                    </button>
                    <button
                        onClick={() => setShowDocuments(true)}
                        className="bg-orange-900/40 hover:bg-orange-900/60 border border-orange-700/30 rounded-xl p-3 flex flex-col items-center gap-1.5 transition-colors"
                    >
                        <div className="w-8 h-8 bg-orange-500/30 rounded-lg flex items-center justify-center">
                            <FileText size={16} className="text-orange-400" />
                        </div>
                        <span className="text-[9px] text-orange-300 font-medium">Docs</span>
                    </button>
                </div>

                {/* Action Plan */}
                <div className="bg-white rounded-xl p-3">
                    <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Action Plan</p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            <p className="text-xs text-gray-800"><b>Evacuate:</b> Route 1 → Moscone Center</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-green-600">✓</span>
                            <p className="text-xs text-gray-800"><b>Neighbor:</b> Check on Sarah K. (Apt 18)</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400">○</span>
                            <p className="text-xs text-gray-800"><b>Kit:</b> Water, First Aid, N99 Masks</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-blue-900/50 border border-blue-800/30 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold text-white">30</p>
                        <p className="text-[8px] text-blue-300 uppercase">Flood Risk</p>
                    </div>
                    <div className="bg-orange-900/50 border border-orange-800/30 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold text-white">97°</p>
                        <p className="text-[8px] text-orange-300 uppercase">Heat Index</p>
                    </div>
                    <div className="bg-green-900/50 border border-green-800/30 rounded-lg p-2.5 text-center">
                        <p className="text-lg font-bold text-white">7/10</p>
                        <p className="text-[8px] text-green-300 uppercase">Prepared</p>
                    </div>
                </div>

                {/* Community Section */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                    <p className="text-[9px] font-bold text-gray-500 uppercase mb-2">Community Updates</p>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                            <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                                <span className="text-green-400 text-sm">✓</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-white/80">12 neighbors marked as safe</p>
                                <p className="text-[10px] text-gray-500">Last check-in: 5 min ago</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                            <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                                <Share2 size={14} className="text-blue-400" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs text-white/80">3 resources shared nearby</p>
                                <p className="text-[10px] text-gray-500">Water, Transport, Shelter</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Navigation */}
            <div className="shrink-0 bg-[#1a1a1a] border-t border-white/10 px-4 py-2">
                <div className="flex items-center justify-around">
                    {[
                        { id: 'home', icon: Home, label: 'Home' },
                        { id: 'map', icon: Map, label: 'Map' },
                        { id: 'alerts', icon: Bell, label: 'Alerts' },
                        { id: 'community', icon: Users, label: 'Community' },
                        { id: 'profile', icon: User, label: 'Profile' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                if (tab.id === 'community') {
                                    setShowNeighbors(true);
                                } else if (tab.id === 'profile') {
                                    setShowSettings(true);
                                } else if (tab.id === 'map') {
                                    setShowNearbyResources(true);
                                } else if (tab.id === 'alerts') {
                                    setShowAlerts(true);
                                } else {
                                    setActiveTab(tab.id as TabType);
                                }
                            }}
                            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl transition-colors ${activeTab === tab.id
                                ? 'text-blue-400'
                                : 'text-gray-500 hover:text-gray-300'
                                }`}
                        >
                            <tab.icon size={22} />
                            <span className="text-[10px]">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* ChatBot */}
            <ChatBot />
        </div>
    );
}

export default App;
