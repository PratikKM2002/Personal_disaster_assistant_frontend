import { useState } from 'react';
import { X, Users, MapPin, Phone, MessageCircle, Check, AlertCircle, Heart, Clock, ChevronRight, Search, Plus, ChevronLeft, Send } from 'lucide-react';
import clsx from 'clsx';

interface Neighbor {
    id: string;
    name: string;
    distance: string;
    status: 'safe' | 'needs-help' | 'unknown' | 'offering-help';
    lastUpdate: string;
    apartment?: string;
    specialNeeds?: string;
    canOffer?: string[];
    needs?: string[];
    phone?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const MOCK_NEIGHBORS: Neighbor[] = [
    {
        id: '1',
        name: 'Sarah K.',
        distance: '50 ft',
        status: 'safe',
        lastUpdate: '5 min ago',
        apartment: 'Apt 18',
        canOffer: ['First Aid', 'Water'],
        phone: '+1 (555) 123-4567'
    },
    {
        id: '2',
        name: 'Mike R.',
        distance: '100 ft',
        status: 'offering-help',
        lastUpdate: '2 min ago',
        apartment: 'Apt 22',
        canOffer: ['Transportation', 'Generator'],
        phone: '+1 (555) 234-5678'
    },
    {
        id: '3',
        name: 'Maria G.',
        distance: '150 ft',
        status: 'needs-help',
        lastUpdate: '10 min ago',
        apartment: 'Apt 15',
        specialNeeds: 'Mobility assistance needed',
        needs: ['Help evacuating', 'Wheelchair accessible transport'],
        phone: '+1 (555) 345-6789'
    },
    {
        id: '4',
        name: 'Tom H.',
        distance: '200 ft',
        status: 'unknown',
        lastUpdate: '1 hour ago',
        apartment: 'Apt 8',
        phone: '+1 (555) 456-7890'
    },
    {
        id: '5',
        name: 'Lin W.',
        distance: '75 ft',
        status: 'safe',
        lastUpdate: '15 min ago',
        apartment: 'Apt 12',
        canOffer: ['Food', 'Pet care'],
        phone: '+1 (555) 567-8901'
    },
];

const statusConfig = {
    'safe': { color: 'green', label: 'Safe', icon: Check },
    'needs-help': { color: 'red', label: 'Needs Help', icon: AlertCircle },
    'offering-help': { color: 'blue', label: 'Offering Help', icon: Heart },
    'unknown': { color: 'gray', label: 'No Update', icon: Clock },
};

type ViewType = 'list' | 'message' | 'invite' | 'call-confirm';

export function NeighborNetwork({ isOpen, onClose }: Props) {
    const [neighbors, setNeighbors] = useState<Neighbor[]>(MOCK_NEIGHBORS);
    const [filter, setFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentView, setCurrentView] = useState<ViewType>('list');
    const [selectedNeighbor, setSelectedNeighbor] = useState<Neighbor | null>(null);
    const [messageText, setMessageText] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const filteredNeighbors = neighbors.filter(n => {
        if (filter !== 'all' && n.status !== filter) return false;
        if (searchQuery && !n.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const stats = {
        total: neighbors.length,
        safe: neighbors.filter(n => n.status === 'safe').length,
        needsHelp: neighbors.filter(n => n.status === 'needs-help').length,
        offeringHelp: neighbors.filter(n => n.status === 'offering-help').length,
    };

    const handleCall = (neighbor: Neighbor) => {
        setSelectedNeighbor(neighbor);
        setCurrentView('call-confirm');
    };

    const handleMessage = (neighbor: Neighbor) => {
        setSelectedNeighbor(neighbor);
        setMessageText('');
        setCurrentView('message');
    };

    const handleOfferHelp = (neighbor: Neighbor) => {
        // Update neighbor status to show help is being offered
        setNeighbors(neighbors.map(n =>
            n.id === neighbor.id ? { ...n, status: 'offering-help' as const, lastUpdate: 'Just now' } : n
        ));
        showSuccessNotification(`You offered to help ${neighbor.name}`);
    };

    const handleSendMessage = () => {
        if (!messageText.trim() || !selectedNeighbor) return;
        showSuccessNotification(`Message sent to ${selectedNeighbor.name}`);
        setCurrentView('list');
        setMessageText('');
    };

    const handleInvite = () => {
        if (!inviteEmail.trim()) return;
        showSuccessNotification('Invitation sent!');
        setInviteEmail('');
        setCurrentView('list');
    };

    const showSuccessNotification = (message: string) => {
        setSuccessMessage(message);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            setSuccessMessage('');
        }, 2000);
    };

    const initiateCall = () => {
        if (selectedNeighbor?.phone) {
            window.location.href = `tel:${selectedNeighbor.phone}`;
        }
        setCurrentView('list');
    };

    if (!isOpen) return null;

    // Message View
    if (currentView === 'message' && selectedNeighbor) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
                <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentView('list')}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft size={18} className="text-white" />
                            </button>
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">
                                {selectedNeighbor.name.charAt(0)}
                            </div>
                            <div>
                                <h2 className="text-white font-bold">{selectedNeighbor.name}</h2>
                                <p className="text-white/70 text-xs">{selectedNeighbor.apartment} • {selectedNeighbor.distance}</p>
                            </div>
                        </div>
                    </div>

                    {/* Quick Messages */}
                    <div className="p-4 border-b border-white/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Quick Messages</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                'Are you safe?',
                                'Need any help?',
                                'I can help you evacuate',
                                'I have supplies',
                            ].map((msg) => (
                                <button
                                    key={msg}
                                    onClick={() => setMessageText(msg)}
                                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-white transition-colors"
                                >
                                    {msg}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message Input */}
                    <div className="flex-1 p-4">
                        <textarea
                            value={messageText}
                            onChange={(e) => setMessageText(e.target.value)}
                            placeholder="Type your message..."
                            rows={5}
                            className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                        />
                    </div>

                    {/* Send Button */}
                    <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                        <button
                            onClick={handleSendMessage}
                            disabled={!messageText.trim()}
                            className={clsx(
                                "w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all",
                                messageText.trim()
                                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white"
                                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            <Send size={18} />
                            Send Message
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Call Confirmation View
    if (currentView === 'call-confirm' && selectedNeighbor) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                <div className="w-full max-w-sm bg-[#1c1c1e] rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                    <div className="p-6 text-center">
                        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white">
                            {selectedNeighbor.name.charAt(0)}
                        </div>
                        <h2 className="text-white font-bold text-xl">{selectedNeighbor.name}</h2>
                        <p className="text-gray-400 text-sm mt-1">{selectedNeighbor.phone}</p>
                        <p className="text-gray-500 text-xs mt-1">{selectedNeighbor.apartment}</p>
                    </div>
                    <div className="p-4 space-y-2">
                        <button
                            onClick={initiateCall}
                            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
                        >
                            <Phone size={20} />
                            Call Now
                        </button>
                        <button
                            onClick={() => setCurrentView('list')}
                            className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-300 font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Invite View
    if (currentView === 'invite') {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
                <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 p-4 z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentView('list')}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft size={18} className="text-white" />
                            </button>
                            <div>
                                <h2 className="text-white font-bold text-lg">Invite Neighbors</h2>
                                <p className="text-white/70 text-xs">Grow your safety network</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-4 space-y-4">
                        <p className="text-gray-400 text-sm">
                            Invite your neighbors to join Guardian AI and stay connected during emergencies.
                        </p>

                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Email Address</label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="neighbor@example.com"
                                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-xl">
                            <p className="text-teal-300 text-sm">
                                💡 Tip: The more neighbors in your network, the better you can help each other during disasters.
                            </p>
                        </div>

                        {/* Share Options */}
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Or share via</p>
                            <div className="flex gap-2">
                                <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors">
                                    📱 SMS
                                </button>
                                <button className="flex-1 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white text-sm font-medium transition-colors">
                                    📋 Copy Link
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                        <button
                            onClick={handleInvite}
                            disabled={!inviteEmail.trim()}
                            className={clsx(
                                "w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all",
                                inviteEmail.trim()
                                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            <Send size={18} />
                            Send Invitation
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Main List View
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
            <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                {/* Success Toast */}
                {showSuccess && (
                    <div className="absolute top-4 left-4 right-4 z-50 p-3 bg-green-500/90 rounded-xl flex items-center gap-3 animate-pulse">
                        <Check size={20} className="text-white" />
                        <p className="text-white font-medium">{successMessage}</p>
                    </div>
                )}

                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-teal-600 to-cyan-600 p-4 z-10 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Users size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Neighbor Network</h2>
                                <p className="text-white/70 text-xs">{stats.total} neighbors in your area</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X size={18} className="text-white" />
                        </button>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <button
                            onClick={() => setFilter('safe')}
                            className={clsx("rounded-xl p-2 text-center transition-colors", filter === 'safe' ? 'bg-white/30' : 'bg-white/10')}
                        >
                            <p className="text-green-300 text-lg font-bold">{stats.safe}</p>
                            <p className="text-white/60 text-[10px] uppercase">Safe</p>
                        </button>
                        <button
                            onClick={() => setFilter('needs-help')}
                            className={clsx("rounded-xl p-2 text-center transition-colors", filter === 'needs-help' ? 'bg-white/30' : 'bg-white/10')}
                        >
                            <p className="text-red-300 text-lg font-bold">{stats.needsHelp}</p>
                            <p className="text-white/60 text-[10px] uppercase">Need Help</p>
                        </button>
                        <button
                            onClick={() => setFilter('offering-help')}
                            className={clsx("rounded-xl p-2 text-center transition-colors", filter === 'offering-help' ? 'bg-white/30' : 'bg-white/10')}
                        >
                            <p className="text-blue-300 text-lg font-bold">{stats.offeringHelp}</p>
                            <p className="text-white/60 text-[10px] uppercase">Offering</p>
                        </button>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="px-4 py-3 border-b border-white/10 space-y-3 shrink-0">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search neighbors..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full py-2.5 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                        {['all', 'safe', 'needs-help', 'offering-help', 'unknown'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors",
                                    filter === f
                                        ? "bg-white text-black"
                                        : "bg-white/10 text-white/70 hover:bg-white/20"
                                )}
                            >
                                {f === 'all' ? 'All' : statusConfig[f as keyof typeof statusConfig]?.label || f}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Priority Alert */}
                {stats.needsHelp > 0 && (
                    <button
                        onClick={() => setFilter('needs-help')}
                        className="mx-4 mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 hover:bg-red-500/20 transition-colors"
                    >
                        <AlertCircle size={20} className="text-red-400 shrink-0" />
                        <div className="flex-1 text-left">
                            <p className="text-red-300 text-sm font-medium">{stats.needsHelp} neighbor(s) need help</p>
                            <p className="text-red-300/60 text-xs">Tap to see who needs assistance</p>
                        </div>
                        <ChevronRight size={18} className="text-red-400" />
                    </button>
                )}

                {/* Neighbors List */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {filteredNeighbors.map((neighbor) => {
                        const config = statusConfig[neighbor.status];
                        const StatusIcon = config.icon;
                        const colorClasses = {
                            green: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400' },
                            red: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400' },
                            blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
                            gray: { bg: 'bg-gray-500/20', border: 'border-gray-500/30', text: 'text-gray-400' },
                        }[config.color];

                        return (
                            <div
                                key={neighbor.id}
                                className={clsx(
                                    "p-4 rounded-2xl border transition-all",
                                    colorClasses?.bg,
                                    colorClasses?.border
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-2",
                                        colorClasses?.border,
                                        colorClasses?.text
                                    )}
                                        style={{ backgroundColor: `${config.color === 'green' ? 'rgba(34,197,94,0.2)' : config.color === 'red' ? 'rgba(239,68,68,0.2)' : config.color === 'blue' ? 'rgba(59,130,246,0.2)' : 'rgba(107,114,128,0.2)'}` }}
                                    >
                                        {neighbor.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-semibold">{neighbor.name}</h3>
                                            <span className={clsx("text-xs font-medium px-2 py-0.5 rounded-full", colorClasses?.bg, colorClasses?.text)}>
                                                {config.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-gray-400 text-xs flex items-center gap-1">
                                                <MapPin size={12} />
                                                {neighbor.apartment} • {neighbor.distance}
                                            </span>
                                            <span className="text-gray-500 text-xs flex items-center gap-1">
                                                <Clock size={12} />
                                                {neighbor.lastUpdate}
                                            </span>
                                        </div>

                                        {neighbor.specialNeeds && (
                                            <div className="mt-2 p-2 bg-red-500/10 rounded-lg">
                                                <p className="text-red-300 text-xs">{neighbor.specialNeeds}</p>
                                            </div>
                                        )}

                                        {neighbor.canOffer && neighbor.canOffer.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {neighbor.canOffer.map((offer, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full">
                                                        {offer}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {neighbor.needs && neighbor.needs.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {neighbor.needs.map((need, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">
                                                        {need}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <StatusIcon size={24} className={colorClasses?.text} />
                                </div>

                                {/* Action Buttons - Show for all neighbors */}
                                <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                                    <button
                                        onClick={() => handleCall(neighbor)}
                                        className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Phone size={16} />
                                        Call
                                    </button>
                                    <button
                                        onClick={() => handleMessage(neighbor)}
                                        className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <MessageCircle size={16} />
                                        Message
                                    </button>
                                    {neighbor.status === 'needs-help' && (
                                        <button
                                            onClick={() => handleOfferHelp(neighbor)}
                                            className="flex-1 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl text-blue-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Heart size={16} />
                                            Help
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {filteredNeighbors.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users size={32} className="text-gray-600" />
                            </div>
                            <p className="text-gray-400">No neighbors found</p>
                            <p className="text-gray-500 text-sm mt-1">Try adjusting your filters</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                    <button
                        onClick={() => setCurrentView('invite')}
                        className="w-full py-4 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus size={18} />
                        Invite Neighbors to Network
                    </button>
                </div>
            </div>
        </div>
    );
}
