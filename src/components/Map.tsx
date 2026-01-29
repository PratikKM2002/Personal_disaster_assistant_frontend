import { Hazard } from '../data';

interface Props {
    hazard: Hazard;
}

export function Map({ hazard }: Props) {
    return (
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a2634] to-[#0d1419] overflow-hidden">

            {/* Animated Background Grid */}
            <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice">
                <defs>
                    <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                    </pattern>
                    <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="rgba(34, 197, 94, 0.15)" />
                        <stop offset="100%" stopColor="transparent" />
                    </radialGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                <ellipse cx="200" cy="400" rx="150" ry="200" fill="url(#centerGlow)" className="animate-pulse" />

                {/* Street Lines */}
                <g stroke="rgba(255,255,255,0.08)" strokeWidth="12" fill="none" strokeLinecap="round">
                    <path d="M 0 320 L 400 320" />
                    <path d="M 0 480 L 400 480" />
                    <path d="M 120 0 L 120 800" />
                    <path d="M 300 0 L 300 800" />
                </g>
            </svg>

            {/* Hazard Zone - Positioned in visible area */}
            <div
                className="absolute animate-pulse"
                style={{ top: '32%', left: '55%', transform: 'translate(-50%, -50%)' }}
            >
                <div className="relative">
                    {/* Outer glow */}
                    <div className="absolute -inset-4 bg-red-500/10 rounded-full blur-2xl" />
                    {/* Zone shape */}
                    <div className="w-28 h-20 bg-red-500/20 border-2 border-dashed border-red-400/60 rounded-[45%] flex items-center justify-center backdrop-blur-sm">
                        <span className="text-red-300 text-[9px] font-bold uppercase tracking-wider bg-red-900/80 px-2 py-0.5 rounded-full shadow-lg">
                            Hazard Zone
                        </span>
                    </div>
                </div>
            </div>

            {/* Evacuation Route with Animation */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 800">
                <defs>
                    <filter id="routeGlow">
                        <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <linearGradient id="routeGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#22c55e" />
                        <stop offset="100%" stopColor="#4ade80" />
                    </linearGradient>
                </defs>

                {/* Route path */}
                <path
                    d="M 150 480 Q 180 420 220 380 T 280 320 T 320 280"
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="4"
                    strokeDasharray="14 10"
                    strokeLinecap="round"
                    filter="url(#routeGlow)"
                    className="animate-[dash_2s_linear_infinite]"
                />

                {/* Route label with background */}
                <g transform="translate(260, 290)">
                    <rect x="-25" y="-8" width="50" height="16" rx="8" fill="rgba(0,0,0,0.7)" />
                    <text x="0" y="4" fill="#4ade80" fontSize="8" fontWeight="bold" textAnchor="middle">
                        Route 1
                    </text>
                </g>
            </svg>

            {/* User Location Marker - Centered and visible */}
            <div
                className="absolute z-20"
                style={{ top: '55%', left: '38%', transform: 'translate(-50%, -50%)' }}
            >
                <div className="relative flex flex-col items-center">
                    {/* Multiple ping rings for depth */}
                    <div className="absolute w-8 h-8 bg-blue-400/20 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute w-6 h-6 bg-blue-400/30 rounded-full animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
                    {/* Solid marker */}
                    <div className="w-4 h-4 bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white rounded-full shadow-lg shadow-blue-500/50 z-10" />
                    {/* Label */}
                    <div className="mt-2 text-[9px] font-bold text-white bg-black/80 px-2.5 py-1 rounded-full whitespace-nowrap shadow-lg border border-white/10">
                        📍 You Are Here
                    </div>
                </div>
            </div>

            {/* Shelter Marker - More visible position */}
            <div
                className="absolute z-10 group"
                style={{ top: '30%', right: '8%' }}
            >
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/10 transition-transform hover:scale-105">
                    <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center text-sm shadow-inner">
                        🏠
                    </div>
                    <div>
                        <p className="text-[8px] text-blue-400 font-bold uppercase tracking-wider">Shelter</p>
                        <p className="text-[11px] text-white font-semibold">Moscone Center</p>
                    </div>
                </div>
            </div>

            {/* Hospital Marker */}
            <div
                className="absolute z-10 group"
                style={{ top: '48%', right: '5%' }}
            >
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-red-500/30 shadow-lg shadow-red-500/10 transition-transform hover:scale-105">
                    <div className="w-7 h-7 bg-gradient-to-br from-red-500 to-red-700 rounded-lg flex items-center justify-center text-sm shadow-inner">
                        🏥
                    </div>
                    <div>
                        <p className="text-[8px] text-red-400 font-bold uppercase tracking-wider">Hospital</p>
                        <p className="text-[11px] text-white font-semibold">SF General</p>
                    </div>
                </div>
            </div>

            {/* Fire Station Marker - New */}
            <div
                className="absolute z-10"
                style={{ top: '62%', right: '12%' }}
            >
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-2 rounded-xl border border-orange-500/30 shadow-lg transition-transform hover:scale-105">
                    <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-orange-700 rounded-lg flex items-center justify-center text-sm shadow-inner">
                        🚒
                    </div>
                    <div>
                        <p className="text-[8px] text-orange-400 font-bold uppercase tracking-wider">Fire Station</p>
                        <p className="text-[11px] text-white font-semibold">Station 7</p>
                    </div>
                </div>
            </div>

            {/* Distance indicator */}
            <div
                className="absolute bg-black/60 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10"
                style={{ top: '45%', left: '52%' }}
            >
                <p className="text-[8px] text-green-400 font-bold">0.8 mi to safety</p>
            </div>
        </div>
    );
}
