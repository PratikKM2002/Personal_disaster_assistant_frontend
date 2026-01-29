import { useState, useEffect } from 'react';
import { Navigation, X, Volume2, VolumeX, ChevronRight, MapPin, Clock, Footprints } from 'lucide-react';

interface NavigationStep {
    instruction: string;
    distance: string;
    icon: string;
}

interface Props {
    isActive: boolean;
    onClose: () => void;
    destination: string;
    totalDistance: string;
    estimatedTime: string;
}

const NAVIGATION_STEPS: NavigationStep[] = [
    { instruction: "Head northeast on Mission St", distance: "0.2 mi", icon: "↗️" },
    { instruction: "Turn right onto 3rd St", distance: "0.3 mi", icon: "➡️" },
    { instruction: "Continue straight past Market St", distance: "0.2 mi", icon: "⬆️" },
    { instruction: "Turn left onto Howard St", distance: "0.1 mi", icon: "⬅️" },
    { instruction: "Arrive at Moscone Center Shelter", distance: "", icon: "🏠" },
];

export function NavigationPanel({ isActive, onClose, destination, totalDistance, estimatedTime }: Props) {
    const [currentStep, setCurrentStep] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [distanceRemaining, setDistanceRemaining] = useState(0.8);
    const [timeRemaining, setTimeRemaining] = useState(12);

    // Simulate navigation progress
    useEffect(() => {
        if (!isActive) {
            setCurrentStep(0);
            setDistanceRemaining(0.8);
            setTimeRemaining(12);
            return;
        }

        const interval = setInterval(() => {
            setCurrentStep(prev => {
                if (prev < NAVIGATION_STEPS.length - 1) {
                    return prev + 1;
                }
                return prev;
            });
            setDistanceRemaining(prev => Math.max(0, prev - 0.15));
            setTimeRemaining(prev => Math.max(0, prev - 2));
        }, 5000);

        return () => clearInterval(interval);
    }, [isActive]);

    if (!isActive) return null;

    const currentInstruction = NAVIGATION_STEPS[currentStep];
    const progress = ((currentStep + 1) / NAVIGATION_STEPS.length) * 100;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0d0d0d]">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-500 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Navigation size={24} className="text-white" />
                    <div>
                        <p className="text-white/80 text-xs uppercase tracking-wider">Navigating to</p>
                        <p className="text-white font-bold text-lg">{destination}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        {isMuted ? <VolumeX size={20} className="text-white" /> : <Volume2 size={20} className="text-white" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>
            </div>

            {/* Current Instruction */}
            <div className="bg-[#1a1a1c] p-4 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-green-500/20 rounded-2xl flex items-center justify-center text-3xl">
                        {currentInstruction.icon}
                    </div>
                    <div className="flex-1">
                        <p className="text-white font-bold text-xl leading-tight">{currentInstruction.instruction}</p>
                        {currentInstruction.distance && (
                            <p className="text-green-400 font-semibold mt-1">{currentInstruction.distance}</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-gray-800">
                <div
                    className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-[#111113] border-b border-white/10">
                <div className="flex items-center gap-2 justify-center">
                    <Footprints size={16} className="text-gray-400" />
                    <div>
                        <p className="text-lg font-bold text-white">{distanceRemaining.toFixed(1)} mi</p>
                        <p className="text-[10px] text-gray-500 uppercase">Remaining</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 justify-center border-x border-white/10">
                    <Clock size={16} className="text-gray-400" />
                    <div>
                        <p className="text-lg font-bold text-white">{timeRemaining} min</p>
                        <p className="text-[10px] text-gray-500 uppercase">ETA</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 justify-center">
                    <MapPin size={16} className="text-gray-400" />
                    <div>
                        <p className="text-lg font-bold text-green-400">{currentStep + 1}/{NAVIGATION_STEPS.length}</p>
                        <p className="text-[10px] text-gray-500 uppercase">Steps</p>
                    </div>
                </div>
            </div>

            {/* Map Preview Area */}
            <div className="flex-1 bg-[#0f1419] relative overflow-hidden">
                {/* Simplified route visualization */}
                <svg className="w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid meet">
                    {/* Grid */}
                    <defs>
                        <pattern id="navGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1a1a1a" strokeWidth="1" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#navGrid)" />

                    {/* Route */}
                    <path
                        d="M 80 250 L 80 180 L 200 180 L 200 100 L 320 100"
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="1000"
                        strokeDashoffset={1000 - (progress * 10)}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />

                    {/* Completed route */}
                    <path
                        d="M 80 250 L 80 180 L 200 180 L 200 100 L 320 100"
                        fill="none"
                        stroke="#166534"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="1000"
                        strokeDashoffset={1000 - (progress * 10)}
                        opacity="0.5"
                    />

                    {/* User position (animated) */}
                    <circle
                        cx={80 + (progress * 2.4)}
                        cy={250 - (progress * 1.5)}
                        r="12"
                        fill="#3b82f6"
                        stroke="white"
                        strokeWidth="3"
                    />

                    {/* Destination */}
                    <circle cx="320" cy="100" r="15" fill="#22c55e" stroke="white" strokeWidth="3" />
                    <text x="320" y="105" textAnchor="middle" fill="white" fontSize="14">🏠</text>
                </svg>

                {/* Current location indicator */}
                <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg px-3 py-2 border border-blue-500/30">
                    <p className="text-[10px] text-gray-400 uppercase">Current Location</p>
                    <p className="text-sm text-white font-medium">Mission District</p>
                </div>
            </div>

            {/* Upcoming Steps */}
            <div className="bg-[#111113] border-t border-white/10 max-h-40 overflow-y-auto">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold px-4 pt-3 pb-2">Upcoming</p>
                {NAVIGATION_STEPS.slice(currentStep + 1).map((step, index) => (
                    <div key={index} className="flex items-center gap-3 px-4 py-2 border-b border-white/5">
                        <span className="text-xl">{step.icon}</span>
                        <p className="text-sm text-white/70 flex-1">{step.instruction}</p>
                        {step.distance && <span className="text-xs text-gray-500">{step.distance}</span>}
                        <ChevronRight size={14} className="text-gray-600" />
                    </div>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 bg-[#0d0d0d] border-t border-white/10 flex gap-2">
                <button
                    onClick={onClose}
                    className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 rounded-xl text-red-400 font-semibold transition-colors"
                >
                    End Navigation
                </button>
                <button className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-semibold transition-colors">
                    Share Location
                </button>
            </div>
        </div>
    );
}
