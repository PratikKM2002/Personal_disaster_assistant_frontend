import { CheckCircle2, Flame, Droplets, ChevronUp, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    isExpanded: boolean;
    onToggle: () => void;
}

export function Dashboard({ isExpanded, onToggle }: Props) {
    return (
        <div className="absolute bottom-0 left-0 right-0 z-50">
            {/* Glass Panel */}
            <div className="bg-[#1c1c1e]/98 backdrop-blur-xl rounded-t-[20px] border-t border-white/10 shadow-[0_-8px_30px_rgba(0,0,0,0.4)]">

                {/* Handle */}
                <button
                    onClick={onToggle}
                    className="w-full py-2 flex flex-col items-center gap-0.5 hover:bg-white/5 transition-colors rounded-t-[20px]"
                >
                    <div className="w-9 h-1 bg-white/25 rounded-full" />
                    <span className="text-white/30">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                    </span>
                </button>

                {/* Stats Row - Always Visible */}
                <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                    <StatCard icon={<Droplets size={14} />} label="FLOOD RISK" value="30/100" sub="1-DAY" color="blue" />
                    <StatCard icon={<Flame size={14} />} label="HEATWAVE" value="97°F" sub="UNHEALTHY" color="orange" />
                    <StatCard icon={<CheckCircle2 size={14} />} label="PREPARED" value="7/10" sub="REVIEW" color="green" />
                </div>

                {/* Expandable Action Plan */}
                <div className={clsx(
                    "overflow-hidden transition-all duration-300",
                    isExpanded ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
                )}>
                    <div className="px-3 pb-4 border-t border-white/10 pt-3">
                        <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                            Personalized Guidance
                        </h3>
                        <div className="space-y-2">
                            <ActionItem checked text="EVACUATE NOW: Follow Route 1 to Moscone Center" />
                            <ActionItem checked text="CHECK ON NEIGHBOR: Sarah K. (Apt. 18)" />
                            <ActionItem text="GATHER EMERGENCY KIT: Water, First Aid, N99 Masks" />
                            <ActionItem text="SECURE PROPERTY: Turn off Gas" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActionItem({ text, checked }: { text: string; checked?: boolean }) {
    return (
        <div className="flex items-center gap-2">
            <div className={clsx(
                "w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0",
                checked ? "bg-green-500/20 border-green-500/50 text-green-400" : "border-gray-600"
            )}>
                {checked && <CheckCircle2 size={8} />}
            </div>
            <p className="text-[11px] text-white/75 leading-tight">{text}</p>
        </div>
    );
}

function StatCard({ icon, label, value, sub, color }: {
    icon: React.ReactNode; label: string; value: string; sub: string;
    color: 'blue' | 'orange' | 'green';
}) {
    const colors = {
        blue: 'bg-blue-950/50 border-blue-800/30 text-blue-400',
        orange: 'bg-orange-950/50 border-orange-800/30 text-orange-400',
        green: 'bg-green-950/50 border-green-800/30 text-green-400',
    };
    return (
        <div className={clsx("rounded-xl p-2 border flex flex-col items-center text-center", colors[color])}>
            <div className="mb-0.5 opacity-80">{icon}</div>
            <p className="text-[7px] font-bold uppercase tracking-wide opacity-60">{label}</p>
            <p className="text-[13px] font-bold text-white leading-none">{value}</p>
            <p className="text-[7px] uppercase opacity-40">{sub}</p>
        </div>
    );
}
