import { AlertTriangle, Phone, ExternalLink } from 'lucide-react';
import { Hazard } from '../data';

interface Props {
    hazard: Hazard;
}

export function AlertBanner({ hazard }: Props) {
    if (hazard.severity !== 'critical') return null;

    return (
        <div className="bg-gradient-to-r from-red-900/90 via-red-800/90 to-red-900/90 border-b border-red-700/50 px-6 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg">
                            <AlertTriangle size={20} className="text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-red-300 uppercase tracking-wider">Critical Threat</span>
                                <span className="px-2 py-0.5 bg-white/10 rounded text-xs text-white font-medium">{hazard.type}</span>
                            </div>
                            <p className="text-white font-semibold">{hazard.action}</p>
                        </div>
                    </div>

                    <div className="hidden lg:block h-8 w-px bg-white/20" />

                    <div className="hidden lg:block">
                        <p className="text-xs text-red-300 uppercase tracking-wider mb-0.5">Active Warnings</p>
                        <p className="text-sm text-white/80">{hazard.title} • Air Quality AQI: 180</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
                        <ExternalLink size={16} className="text-white" />
                        <span className="text-sm text-white font-medium">View Details</span>
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg transition-all shadow-lg shadow-red-500/20">
                        <Phone size={16} className="text-white" />
                        <span className="text-sm text-white font-bold">Call 911</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
