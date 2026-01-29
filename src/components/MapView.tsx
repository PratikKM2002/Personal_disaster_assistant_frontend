import { Hazard } from '../data';
import { Layers, ZoomIn, ZoomOut, Locate, Maximize2 } from 'lucide-react';

interface Props {
    hazard: Hazard;
}

export function MapView({ hazard }: Props) {
    return (
        <div className="w-full h-full bg-gradient-to-br from-[#1a2634] to-[#0d1419] relative overflow-hidden">

            {/* Stylized Map Background */}
            <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <pattern id="gridLarge" width="80" height="80" patternUnits="userSpaceOnUse">
                        <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
                    </pattern>
                    <radialGradient id="mapGlow" cx="40%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(34, 197, 94, 0.1)" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#gridLarge)" />
                <ellipse cx="40%" cy="50%" rx="30%" ry="40%" fill="url(#mapGlow)" />

                {/* Street network */}
                <g stroke="rgba(255,255,255,0.06)" strokeWidth="20" fill="none" strokeLinecap="round">
                    <path d="M 0 30% L 100% 30%" />
                    <path d="M 0 60% L 100% 60%" />
                    <path d="M 25% 0 L 25% 100%" />
                    <path d="M 55% 0 L 55% 100%" />
                    <path d="M 80% 0 L 80% 100%" />
                </g>
            </svg>

            {/* Hazard Zone */}
            <div
                className="absolute animate-pulse"
                style={{ top: '25%', left: '50%', transform: 'translate(-50%, -50%)' }}
            >
                <div className="relative">
                    <div className="absolute -inset-8 bg-red-500/10 rounded-full blur-3xl" />
                    <div className="w-48 h-32 bg-red-500/15 border-2 border-dashed border-red-400/50 rounded-[40%] flex items-center justify-center">
                        <div className="bg-red-900/90 px-4 py-1.5 rounded-full">
                            <span className="text-red-300 text-sm font-bold uppercase tracking-wider">⚠️ Hazard Zone</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Evacuation Route */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                    <filter id="routeGlow2">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                <path
                    d="M 30% 70% Q 35% 55% 45% 45% T 65% 30% T 80% 20%"
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="5"
                    strokeDasharray="20 12"
                    strokeLinecap="round"
                    filter="url(#routeGlow2)"
                    opacity="0.9"
                />
                {/* Route label */}
                <g transform="translate(70%, 25%)">
                    <rect x="-35" y="-12" width="70" height="24" rx="12" fill="rgba(0,0,0,0.8)" stroke="#22c55e" strokeWidth="1" />
                    <text y="5" fill="#4ade80" fontSize="12" fontWeight="bold" textAnchor="middle">Route 1</text>
                </g>
            </svg>

            {/* User Location */}
            <div className="absolute" style={{ top: '65%', left: '28%', transform: 'translate(-50%, -50%)' }}>
                <div className="relative flex flex-col items-center">
                    <div className="absolute w-12 h-12 bg-blue-400/30 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute w-8 h-8 bg-blue-400/40 rounded-full animate-ping" style={{ animationDuration: '1.5s' }} />
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 border-3 border-white rounded-full shadow-xl shadow-blue-500/50 z-10" />
                    <div className="mt-3 px-4 py-1.5 bg-black/80 backdrop-blur-sm rounded-full border border-white/20 shadow-lg">
                        <span className="text-sm font-semibold text-white">📍 Your Location</span>
                    </div>
                </div>
            </div>

            {/* Shelter Marker */}
            <div className="absolute group cursor-pointer" style={{ top: '18%', right: '15%' }}>
                <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-3 rounded-xl border border-blue-500/30 shadow-xl transition-all hover:scale-105 hover:border-blue-400/50">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-xl shadow-inner">
                        🏠
                    </div>
                    <div>
                        <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Shelter</p>
                        <p className="text-sm text-white font-semibold">Moscone Center</p>
                        <p className="text-xs text-gray-400">0.8 miles away</p>
                    </div>
                </div>
            </div>

            {/* Hospital Marker */}
            <div className="absolute group cursor-pointer" style={{ top: '45%', right: '10%' }}>
                <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-3 rounded-xl border border-red-500/30 shadow-xl transition-all hover:scale-105 hover:border-red-400/50">
                    <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center text-xl shadow-inner">
                        🏥
                    </div>
                    <div>
                        <p className="text-[10px] text-red-400 font-bold uppercase tracking-wider">Hospital</p>
                        <p className="text-sm text-white font-semibold">SF General</p>
                        <p className="text-xs text-gray-400">1.2 miles away</p>
                    </div>
                </div>
            </div>

            {/* Fire Station Marker */}
            <div className="absolute group cursor-pointer" style={{ top: '70%', right: '20%' }}>
                <div className="flex items-center gap-3 bg-black/80 backdrop-blur-md px-4 py-3 rounded-xl border border-orange-500/30 shadow-xl transition-all hover:scale-105 hover:border-orange-400/50">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center text-xl shadow-inner">
                        🚒
                    </div>
                    <div>
                        <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">Fire Station</p>
                        <p className="text-sm text-white font-semibold">Station 7</p>
                        <p className="text-xs text-gray-400">0.5 miles away</p>
                    </div>
                </div>
            </div>

            {/* Map Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2">
                <button className="p-2.5 bg-black/70 backdrop-blur-md rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <Layers size={18} className="text-white" />
                </button>
                <button className="p-2.5 bg-black/70 backdrop-blur-md rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <ZoomIn size={18} className="text-white" />
                </button>
                <button className="p-2.5 bg-black/70 backdrop-blur-md rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <ZoomOut size={18} className="text-white" />
                </button>
                <button className="p-2.5 bg-black/70 backdrop-blur-md rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <Locate size={18} className="text-white" />
                </button>
                <button className="p-2.5 bg-black/70 backdrop-blur-md rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                    <Maximize2 size={18} className="text-white" />
                </button>
            </div>

            {/* Legend */}
            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md rounded-xl border border-white/10 p-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Legend</h4>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-red-500/50 border border-dashed border-red-400 rounded" />
                        <span className="text-xs text-gray-300">Hazard Zone</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-green-500" />
                        <span className="text-xs text-gray-300">Evacuation Route</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full" />
                        <span className="text-xs text-gray-300">Your Location</span>
                    </div>
                </div>
            </div>

            {/* Distance Info */}
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md rounded-xl border border-green-500/30 px-5 py-3">
                <p className="text-xs text-gray-400 mb-1">Distance to Safety</p>
                <p className="text-2xl font-bold text-green-400">0.8 <span className="text-sm font-normal">miles</span></p>
                <p className="text-xs text-gray-500">~12 min walking</p>
            </div>
        </div>
    );
}
