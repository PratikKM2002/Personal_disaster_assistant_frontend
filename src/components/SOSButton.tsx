import { useState, useEffect, useRef } from 'react';
import { Phone, X, AlertTriangle, MapPin, Users, Shield } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    onActivate?: () => void;
    className?: string;
}

export function SOSButton({ onActivate, className }: Props) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isSending, setIsSending] = useState(false);
    const [sent, setSent] = useState(false);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (countdown !== null && countdown > 0) {
            intervalRef.current = setTimeout(() => {
                setCountdown(countdown - 1);
            }, 1000);
        } else if (countdown === 0) {
            triggerSOS();
        }

        return () => {
            if (intervalRef.current) clearTimeout(intervalRef.current);
        };
    }, [countdown]);

    const startSOS = () => {
        setCountdown(5);
    };

    const cancelSOS = () => {
        setCountdown(null);
        if (intervalRef.current) clearTimeout(intervalRef.current);
    };

    const triggerSOS = () => {
        setIsSending(true);
        setCountdown(null);

        // Simulate sending SOS
        setTimeout(() => {
            setIsSending(false);
            setSent(true);
            onActivate?.();

            // Reset after showing success
            setTimeout(() => {
                setSent(false);
                setIsExpanded(false);
            }, 3000);
        }, 2000);
    };

    if (!isExpanded) {
        return (
            <button
                onClick={() => setIsExpanded(true)}
                className={clsx(
                    "relative group",
                    className
                )}
            >
                <div className="absolute inset-0 bg-red-500/30 rounded-full blur-xl animate-pulse" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 border-2 border-red-400/50 transition-transform hover:scale-110 active:scale-95">
                    <span className="text-white font-black text-lg">SOS</span>
                </div>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-sm bg-[#1c1c1e] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <AlertTriangle className="text-white" size={20} />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">Emergency SOS</h2>
                            <p className="text-white/70 text-xs">Send alert to all contacts</p>
                        </div>
                    </div>
                    {!countdown && !isSending && !sent && (
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X size={18} className="text-white" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6">
                    {countdown !== null ? (
                        <div className="text-center py-4">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="absolute inset-0 bg-red-500/20 rounded-full animate-ping" />
                                <div className="w-32 h-32 bg-gradient-to-br from-red-500 to-red-700 rounded-full flex items-center justify-center border-4 border-red-400/50">
                                    <span className="text-white text-5xl font-black">{countdown}</span>
                                </div>
                            </div>
                            <p className="text-white mt-6 font-semibold">Sending SOS in {countdown} seconds</p>
                            <p className="text-gray-400 text-sm mt-1">Tap cancel to abort</p>
                            <button
                                onClick={cancelSOS}
                                className="mt-6 w-full py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl text-white font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    ) : isSending ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center animate-pulse">
                                <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                            <p className="text-white mt-6 font-semibold">Sending Emergency Alert...</p>
                            <p className="text-gray-400 text-sm mt-1">Broadcasting your location</p>
                        </div>
                    ) : sent ? (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
                                <Shield className="text-green-400" size={40} />
                            </div>
                            <p className="text-green-400 mt-6 font-bold text-lg">SOS Sent Successfully</p>
                            <p className="text-gray-400 text-sm mt-1">Help is on the way</p>
                            <div className="mt-4 p-3 bg-white/5 rounded-xl">
                                <p className="text-xs text-gray-400">Notified:</p>
                                <p className="text-sm text-white mt-1">3 Emergency Contacts • 911</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* What happens section */}
                            <div className="space-y-3 mb-6">
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">What happens when you send SOS:</p>
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
                                        <Phone size={16} className="text-red-400" />
                                    </div>
                                    <p className="text-sm text-white/80">Emergency services (911) will be alerted</p>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                                        <Users size={16} className="text-blue-400" />
                                    </div>
                                    <p className="text-sm text-white/80">Your emergency contacts will be notified</p>
                                </div>
                                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                                        <MapPin size={16} className="text-green-400" />
                                    </div>
                                    <p className="text-sm text-white/80">Your live location will be shared</p>
                                </div>
                            </div>

                            {/* SOS Button */}
                            <button
                                onClick={startSOS}
                                className="w-full py-5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-2xl text-white font-bold text-lg transition-all shadow-lg shadow-red-500/30 active:scale-[0.98]"
                            >
                                Hold to Send SOS
                            </button>

                            {/* Quick call buttons */}
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                <button className="py-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/30 rounded-xl text-orange-400 font-semibold text-sm transition-colors">
                                    📞 Call 911
                                </button>
                                <button className="py-3 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-xl text-blue-400 font-semibold text-sm transition-colors">
                                    👨‍👩‍👧 Call Family
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
