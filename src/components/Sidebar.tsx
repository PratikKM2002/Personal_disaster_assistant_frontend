import { CheckCircle2, Flame, Droplets, ChevronLeft, ChevronRight, MapPin, Clock, Users, Package } from 'lucide-react';
import clsx from 'clsx';
import { Hazard } from '../data';

interface Props {
    hazard: Hazard;
    isOpen: boolean;
    onToggle: () => void;
}

export function Sidebar({ hazard, isOpen, onToggle }: Props) {
    return (
        <aside className={clsx(
            "bg-[#111113] border-r border-white/10 flex flex-col transition-all duration-300 shrink-0",
            isOpen ? "w-80" : "w-0 overflow-hidden"
        )}>
            {/* Toggle Button */}
            <button
                onClick={onToggle}
                className="absolute left-[318px] top-1/2 -translate-y-1/2 z-10 p-1.5 bg-[#1a1a1c] border border-white/10 rounded-r-lg hover:bg-white/5 transition-colors"
                style={{ display: isOpen ? 'block' : 'none' }}
            >
                <ChevronLeft size={16} className="text-gray-400" />
            </button>

            {/* Content */}
            <div className="flex-1 overflow-y-auto hide-scrollbar p-5 space-y-6">

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                    <StatCard icon={<Droplets size={18} />} label="Flood Risk" value="30%" color="blue" />
                    <StatCard icon={<Flame size={18} />} label="Heat Index" value="97°F" color="orange" />
                    <StatCard icon={<Clock size={18} />} label="Last Update" value="2 min" color="gray" />
                    <StatCard icon={<Users size={18} />} label="Neighbors" value="12 safe" color="green" />
                </div>

                {/* Preparedness Score */}
                <div className="glass-panel rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-white">Preparedness Score</h3>
                        <span className="text-2xl font-bold text-green-400">7/10</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full w-[70%] bg-gradient-to-r from-green-500 to-green-400 rounded-full" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Complete kit review to improve</p>
                </div>

                {/* Action Plan */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Action Plan
                    </h3>
                    <div className="space-y-2">
                        <ActionItem checked priority="high" text="EVACUATE: Follow Route 1 to Moscone Center" />
                        <ActionItem checked text="CHECK ON NEIGHBOR: Sarah K. (Apt. 18)" />
                        <ActionItem text="GATHER EMERGENCY KIT: Water, First Aid, N99 Masks" />
                        <ActionItem text="SECURE PROPERTY: Turn off Gas" />
                        <ActionItem text="NOTIFY FAMILY: Send location update" />
                    </div>
                </div>

                {/* Nearby Resources */}
                <div>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Nearby Resources
                    </h3>
                    <div className="space-y-2">
                        <ResourceItem icon="🏠" name="Moscone Center" type="Shelter" distance="0.8 mi" />
                        <ResourceItem icon="🏥" name="SF General Hospital" type="Hospital" distance="1.2 mi" />
                        <ResourceItem icon="🚒" name="Station 7" type="Fire Station" distance="0.5 mi" />
                        <ResourceItem icon="💧" name="Water Distribution" type="Supply Point" distance="0.3 mi" />
                    </div>
                </div>
            </div>

            {/* Bottom Action */}
            <div className="p-4 border-t border-white/10">
                <button className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 rounded-xl text-white font-semibold transition-all flex items-center justify-center gap-2">
                    <MapPin size={18} />
                    Start Navigation
                </button>
            </div>
        </aside>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: 'blue' | 'orange' | 'green' | 'gray' }) {
    const colors = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
        green: 'text-green-400 bg-green-500/10 border-green-500/20',
        gray: 'text-gray-400 bg-gray-500/10 border-gray-500/20',
    };
    return (
        <div className={clsx("rounded-xl p-3 border flex flex-col", colors[color])}>
            <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-[10px] uppercase tracking-wider opacity-70">{label}</span>
            </div>
            <span className="text-lg font-bold text-white">{value}</span>
        </div>
    );
}

function ActionItem({ text, checked, priority }: { text: string; checked?: boolean; priority?: 'high' }) {
    return (
        <div className={clsx(
            "flex items-start gap-3 p-3 rounded-lg transition-colors",
            priority === 'high' ? "bg-red-500/10 border border-red-500/20" : "bg-white/5 hover:bg-white/10"
        )}>
            <div className={clsx(
                "mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
                checked ? "bg-green-500/20 border-green-500 text-green-400" : "border-gray-600"
            )}>
                {checked && <CheckCircle2 size={12} />}
            </div>
            <p className={clsx("text-sm leading-snug", checked ? "text-white/70" : "text-white")}>{text}</p>
        </div>
    );
}

function ResourceItem({ icon, name, type, distance }: { icon: string; name: string; type: string; distance: string }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-lg">
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{name}</p>
                <p className="text-xs text-gray-500">{type}</p>
            </div>
            <span className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">{distance}</span>
        </div>
    );
}
