import { useState } from 'react';
import { DUMMY_HAZARDS } from './data';
import { Menu, Shield, Wifi, Battery, Signal } from 'lucide-react';
import { RealMap } from './components/RealMap';
import { NavigationPanel } from './components/NavigationPanel';

function App() {
    const [activeHazard] = useState(DUMMY_HAZARDS[0]);
    const [isNavigating, setIsNavigating] = useState(false);

    const handleStartNavigation = () => {
        setIsNavigating(true);
    };

    const handleStopNavigation = () => {
        setIsNavigating(false);
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#0d0d0d] text-white overflow-hidden">
            {/* Navigation Panel (fullscreen overlay) */}
            <NavigationPanel
                isActive={isNavigating}
                onClose={handleStopNavigation}
                destination="Moscone Center Shelter"
                totalDistance="0.8 mi"
                estimatedTime="12 min"
            />

            {/* Status Bar */}
            <div className="flex items-center justify-between px-6 py-2 text-xs">
                <span className="font-medium">9:41</span>
                <div className="flex items-center gap-1">
                    <Signal size={14} />
                    <Wifi size={14} />
                    <Battery size={14} />
                </div>
            </div>

            {/* Header */}
            <header className="flex items-center justify-between px-5 py-3">
                <button className="p-2">
                    <Menu size={22} className="text-gray-400" />
                </button>
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-2">
                        <Shield size={18} className="text-white" />
                        <span className="text-lg font-semibold">Guardian AI</span>
                    </div>
                    <span className="text-xs text-gray-500">San Francisco, CA</span>
                </div>
                <div className="w-10" /> {/* Spacer */}
            </header>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-4 space-y-3">

                {/* Critical Alert */}
                <div className="bg-gradient-to-b from-[#8B0000] to-[#5C0000] rounded-2xl p-4">
                    <h2 className="text-xl font-bold text-white leading-tight">
                        CRITICAL THREAT: Wildfire.
                    </h2>
                    <p className="text-lg font-semibold text-white/90">
                        Evaucate Zone B IMMEDATELY
                    </p>
                </div>

                {/* Warnings Row */}
                <div className="flex gap-2">
                    <div className="flex-1 bg-[#3D2914] border border-[#8B5A2B]/50 rounded-xl p-3">
                        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-1">Active Warnings:</p>
                        <p className="text-xs text-white/80 leading-snug">
                            Wildfire Spreading (Mission District),<br />
                            Air Quality Alert AQI. 180
                        </p>
                    </div>
                    <button className="bg-gradient-to-r from-[#E85D4C] to-[#C74B3B] rounded-xl px-4 flex items-center gap-2 shrink-0">
                        <span className="text-lg">📞</span>
                        <span className="text-xs font-bold text-white uppercase">Call Emergency (911)</span>
                    </button>
                </div>

                {/* Map Area - Real Map */}
                <div className="rounded-2xl overflow-hidden" style={{ height: '260px' }}>
                    <RealMap onNavigate={handleStartNavigation} />
                </div>

                {/* Action Plan Section */}
                <div className="bg-[#f5f5f5] rounded-2xl p-4 text-black">
                    <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-4">
                        Personalized Guidance & Action Plan
                    </h3>
                    <div className="space-y-3">
                        <ActionItem checked label="EVACUATE NOW:" detail="Follow Route 1 to Moscone Center Shelter" />
                        <ActionItem checked label="CHECK ON NEIGHBOR:" detail="Sarah K. (Apt.18) your zone" />
                        <ActionItem checked label="GATHER EMERGENCY KIT:" detail="Water, First Aid) N99 Masks" />
                        <ActionItem checked label="SECURE PROPERTY:" detail="Turn off Gas" />
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-2">
                    <StatCard
                        color="blue"
                        icon="⏱"
                        title="HIGH FLOOD RISK"
                        subtitle="(1-DAY FORECAST)"
                        value="30/100"
                    />
                    <StatCard
                        color="orange"
                        icon="☀️"
                        title="HEATWAVE ADVISORY"
                        subtitle="97°F - UNHEALTHY"
                    />
                    <StatCard
                        color="green"
                        icon="☀️"
                        title="PREPAREDNESS SCORE:"
                        subtitle="Complete kit review"
                        value="7/10"
                    />
                </div>
            </div>
        </div>
    );
}

function ActionItem({ checked, label, detail }: { checked?: boolean; label: string; detail: string }) {
    return (
        <div className="flex items-start gap-3">
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${checked ? 'bg-gray-700 border-gray-700 text-white' : 'border-gray-400'}`}>
                {checked && <span className="text-xs">✓</span>}
            </div>
            <p className="text-sm">
                <span className="font-bold">{label}</span> {detail}
            </p>
        </div>
    );
}

function StatCard({ color, icon, title, subtitle, value }: { color: 'blue' | 'orange' | 'green'; icon: string; title: string; subtitle: string; value?: string }) {
    const colors = {
        blue: 'bg-[#1E3A5F] border-[#2E5A8F]',
        orange: 'bg-[#5C3D1E] border-[#8B5A2B]',
        green: 'bg-[#1E4D2B] border-[#2E7D4B]',
    };

    return (
        <div className={`${colors[color]} border rounded-xl p-3 text-center`}>
            <div className="text-lg mb-1">{icon}</div>
            <p className="text-[8px] text-white/70 uppercase leading-tight font-bold">{title}</p>
            {value && <p className="text-sm font-bold text-white mt-1">{value}</p>}
            <p className="text-[8px] text-white/50 uppercase mt-0.5">{subtitle}</p>
        </div>
    );
}

export default App;
