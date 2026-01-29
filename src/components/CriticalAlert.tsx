import { AlertTriangle, Phone } from 'lucide-react';
import { Hazard } from '../data';

interface Props {
    hazard: Hazard;
}

export function CriticalAlert({ hazard }: Props) {
    if (hazard.severity !== 'critical') return null;

    return (
        <div className="absolute top-[88px] left-3 right-3 z-40 space-y-2">
            {/* Main Alert Card */}
            <div className="bg-gradient-to-r from-red-700 to-red-800 rounded-2xl p-3.5 shadow-xl border border-red-600/30">
                <div className="flex items-center gap-3">
                    <div className="bg-white/15 rounded-xl p-2">
                        <AlertTriangle className="text-white" size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-white font-bold text-[13px] uppercase tracking-wide leading-tight">
                            Critical Threat: {hazard.type}
                        </h2>
                        <p className="text-white/90 text-[12px] mt-0.5">{hazard.action}</p>
                    </div>
                </div>
            </div>

            {/* Secondary Row */}
            <div className="flex gap-2">
                {/* Warnings Card */}
                <div className="flex-1 bg-[#1c1c1e]/95 backdrop-blur-md rounded-xl p-2.5 border border-orange-500/20">
                    <p className="text-[8px] text-orange-400 font-bold uppercase tracking-wider mb-0.5">Active Warnings:</p>
                    <p className="text-[10px] text-white/70 leading-snug">{hazard.title}</p>
                    <p className="text-[10px] text-white/50">Air Quality Alert AQI: 180</p>
                </div>

                {/* Emergency Button */}
                <button className="bg-gradient-to-br from-orange-500 to-red-600 rounded-xl px-3 flex items-center gap-1.5 shadow-lg hover:brightness-110 active:scale-95 transition-all shrink-0">
                    <Phone size={14} className="text-white" />
                    <div className="text-left">
                        <span className="text-white font-bold text-[9px] uppercase block leading-tight">Call</span>
                        <span className="text-white/90 text-[8px] uppercase">Emergency</span>
                    </div>
                </button>
            </div>
        </div>
    );
}
