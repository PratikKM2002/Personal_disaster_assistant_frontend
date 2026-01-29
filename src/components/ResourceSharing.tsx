import { useState } from 'react';
import { X, Share2, Package, Plus, MapPin, Clock, MessageCircle, Check, Heart, ChevronLeft, Send } from 'lucide-react';
import clsx from 'clsx';

interface Resource {
    id: string;
    type: 'offering' | 'requesting';
    category: string;
    icon: string;
    title: string;
    description: string;
    postedBy: string;
    distance: string;
    timeAgo: string;
    quantity?: string;
    claimed?: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const CATEGORIES = [
    { id: 'all', label: 'All', icon: '📦' },
    { id: 'water', label: 'Water', icon: '💧' },
    { id: 'food', label: 'Food', icon: '🍞' },
    { id: 'shelter', label: 'Shelter', icon: '🏠' },
    { id: 'transport', label: 'Transport', icon: '🚗' },
    { id: 'medical', label: 'Medical', icon: '🏥' },
    { id: 'supplies', label: 'Supplies', icon: '📦' },
];

const MOCK_RESOURCES: Resource[] = [
    {
        id: '1',
        type: 'offering',
        category: 'water',
        icon: '💧',
        title: 'Bottled Water - 24 Pack',
        description: 'Sealed case of bottled water. Can deliver within 2 blocks.',
        postedBy: 'Mike R.',
        distance: '0.2 mi',
        timeAgo: '5 min ago',
        quantity: '24 bottles',
    },
    {
        id: '2',
        type: 'requesting',
        category: 'medical',
        icon: '🏥',
        title: 'Need N95 Masks',
        description: 'Family of 4 needs masks for evacuation. Any help appreciated.',
        postedBy: 'Sarah K.',
        distance: '0.1 mi',
        timeAgo: '15 min ago',
        quantity: '4 masks',
    },
    {
        id: '3',
        type: 'offering',
        category: 'transport',
        icon: '🚗',
        title: 'Vehicle for Evacuation',
        description: 'SUV with space for 4 passengers. Heading to Moscone Center.',
        postedBy: 'Lin W.',
        distance: '0.3 mi',
        timeAgo: '8 min ago',
        quantity: '4 seats',
    },
    {
        id: '4',
        type: 'offering',
        category: 'shelter',
        icon: '🏠',
        title: 'Temporary Shelter Space',
        description: 'Extra bedroom available for elderly or disabled evacuees.',
        postedBy: 'Tom H.',
        distance: '0.4 mi',
        timeAgo: '30 min ago',
        quantity: '2 people',
    },
    {
        id: '5',
        type: 'requesting',
        category: 'supplies',
        icon: '📦',
        title: 'Need Flashlight & Batteries',
        description: 'Power is out. Need flashlight to navigate evacuation.',
        postedBy: 'Maria G.',
        distance: '0.15 mi',
        timeAgo: '20 min ago',
    },
    {
        id: '6',
        type: 'offering',
        category: 'food',
        icon: '🍞',
        title: 'Canned Food & Snacks',
        description: 'Assorted canned goods and granola bars. Pick up anytime.',
        postedBy: 'James L.',
        distance: '0.5 mi',
        timeAgo: '45 min ago',
        quantity: '~20 items',
    },
];

interface AddFormData {
    type: 'offering' | 'requesting';
    category: string;
    title: string;
    description: string;
    quantity: string;
}

type ViewType = 'list' | 'add-form' | 'message';

export function ResourceSharing({ isOpen, onClose }: Props) {
    const [resources, setResources] = useState<Resource[]>(MOCK_RESOURCES);
    const [activeTab, setActiveTab] = useState<'all' | 'offering' | 'requesting'>('all');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [currentView, setCurrentView] = useState<ViewType>('list');
    const [addFormType, setAddFormType] = useState<'offering' | 'requesting'>('offering');
    const [formData, setFormData] = useState<AddFormData>({
        type: 'offering',
        category: 'water',
        title: '',
        description: '',
        quantity: '',
    });
    const [showSuccess, setShowSuccess] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
    const [messageText, setMessageText] = useState('');

    const filteredResources = resources.filter(r => {
        if (activeTab !== 'all' && r.type !== activeTab) return false;
        if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
        return true;
    });

    const stats = {
        offerings: resources.filter(r => r.type === 'offering').length,
        requests: resources.filter(r => r.type === 'requesting').length,
    };

    const handleClaim = (id: string) => {
        setResources(resources.map(r =>
            r.id === id ? { ...r, claimed: true } : r
        ));
        showSuccessNotification('Resource claimed! The owner will be notified.');
    };

    const handleOfferHelp = (id: string) => {
        setResources(resources.map(r =>
            r.id === id ? { ...r, claimed: true } : r
        ));
        showSuccessNotification('You offered to help! They will be notified.');
    };

    const showSuccessNotification = (message: string) => {
        setSuccessMessage(message);
        setShowSuccess(true);
        setTimeout(() => {
            setShowSuccess(false);
            setSuccessMessage('');
        }, 2000);
    };

    const openAddForm = (type: 'offering' | 'requesting') => {
        setAddFormType(type);
        setFormData({
            type: type,
            category: 'water',
            title: '',
            description: '',
            quantity: '',
        });
        setCurrentView('add-form');
    };

    const openMessage = (resource: Resource) => {
        setSelectedResource(resource);
        setMessageText('');
        setCurrentView('message');
    };

    const handleSendMessage = () => {
        if (!messageText.trim() || !selectedResource) return;
        showSuccessNotification(`Message sent to ${selectedResource.postedBy}`);
        setCurrentView('list');
        setMessageText('');
    };

    const handleSubmit = () => {
        if (!formData.title.trim() || !formData.description.trim()) return;

        const categoryData = CATEGORIES.find(c => c.id === formData.category);
        const newResource: Resource = {
            id: Date.now().toString(),
            type: formData.type,
            category: formData.category,
            icon: categoryData?.icon || '📦',
            title: formData.title,
            description: formData.description,
            postedBy: 'You',
            distance: '0 mi',
            timeAgo: 'Just now',
            quantity: formData.quantity || undefined,
        };

        setResources([newResource, ...resources]);
        showSuccessNotification(`Your ${formData.type === 'offering' ? 'offer' : 'request'} is now visible!`);

        setTimeout(() => {
            setCurrentView('list');
            setFormData({
                type: 'offering',
                category: 'water',
                title: '',
                description: '',
                quantity: '',
            });
        }, 1500);
    };

    if (!isOpen) return null;

    // Message View
    if (currentView === 'message' && selectedResource) {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
                <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className={clsx(
                        "sticky top-0 p-4 z-10 shrink-0",
                        selectedResource.type === 'offering'
                            ? "bg-gradient-to-r from-emerald-600 to-green-600"
                            : "bg-gradient-to-r from-orange-600 to-amber-600"
                    )}>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentView('list')}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft size={18} className="text-white" />
                            </button>
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">
                                {selectedResource.icon}
                            </div>
                            <div>
                                <h2 className="text-white font-bold">Message {selectedResource.postedBy}</h2>
                                <p className="text-white/70 text-xs">About: {selectedResource.title}</p>
                            </div>
                        </div>
                    </div>

                    {/* Resource Info Card */}
                    <div className="p-4 border-b border-white/10">
                        <div className={clsx(
                            "p-3 rounded-xl border",
                            selectedResource.type === 'offering'
                                ? "bg-emerald-500/10 border-emerald-500/30"
                                : "bg-orange-500/10 border-orange-500/30"
                        )}>
                            <h3 className="text-white font-medium text-sm">{selectedResource.title}</h3>
                            <p className="text-gray-400 text-xs mt-1">{selectedResource.description}</p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-gray-500 text-xs flex items-center gap-1">
                                    <MapPin size={10} />
                                    {selectedResource.distance}
                                </span>
                                {selectedResource.quantity && (
                                    <span className="text-gray-500 text-xs">Qty: {selectedResource.quantity}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Quick Messages */}
                    <div className="p-4 border-b border-white/10">
                        <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2">Quick Messages</p>
                        <div className="flex flex-wrap gap-2">
                            {selectedResource.type === 'offering' ? (
                                <>
                                    {['Is this still available?', 'Can I pick it up now?', 'Can you deliver?', 'What condition is it in?'].map((msg) => (
                                        <button
                                            key={msg}
                                            onClick={() => setMessageText(msg)}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-white transition-colors"
                                        >
                                            {msg}
                                        </button>
                                    ))}
                                </>
                            ) : (
                                <>
                                    {['I can help with this!', 'How many do you need?', 'Where are you located?', "I'll bring it to you"].map((msg) => (
                                        <button
                                            key={msg}
                                            onClick={() => setMessageText(msg)}
                                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm text-white transition-colors"
                                        >
                                            {msg}
                                        </button>
                                    ))}
                                </>
                            )}
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

    // Add Resource Form View
    if (currentView === 'add-form') {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
                <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className={clsx(
                        "sticky top-0 p-4 z-10 shrink-0",
                        addFormType === 'offering'
                            ? "bg-gradient-to-r from-emerald-600 to-green-600"
                            : "bg-gradient-to-r from-orange-600 to-amber-600"
                    )}>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentView('list')}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft size={18} className="text-white" />
                            </button>
                            <div>
                                <h2 className="text-white font-bold text-lg">
                                    {addFormType === 'offering' ? '🎁 Offer a Resource' : '🙏 Request Help'}
                                </h2>
                                <p className="text-white/70 text-xs">
                                    {addFormType === 'offering'
                                        ? 'Share what you can offer to help others'
                                        : 'Let neighbors know what you need'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Success Message */}
                    {showSuccess && (
                        <div className="mx-4 mt-4 p-4 bg-green-500/20 border border-green-500/50 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                                <Check size={20} className="text-white" />
                            </div>
                            <div>
                                <p className="text-green-300 font-semibold">Successfully Posted!</p>
                                <p className="text-green-300/70 text-sm">{successMessage}</p>
                            </div>
                        </div>
                    )}

                    {/* Form Content */}
                    {!showSuccess && (
                        <div className="overflow-y-auto flex-1 p-4 space-y-4">
                            {/* Type Toggle */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Type</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setAddFormType('offering');
                                            setFormData({ ...formData, type: 'offering' });
                                        }}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                                            addFormType === 'offering'
                                                ? "bg-emerald-500 text-white"
                                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        🎁 Offering
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAddFormType('requesting');
                                            setFormData({ ...formData, type: 'requesting' });
                                        }}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2",
                                            addFormType === 'requesting'
                                                ? "bg-orange-500 text-white"
                                                : "bg-white/5 text-gray-400 hover:bg-white/10"
                                        )}
                                    >
                                        🙏 Requesting
                                    </button>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Category</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.filter(c => c.id !== 'all').map((cat) => (
                                        <button
                                            key={cat.id}
                                            onClick={() => setFormData({ ...formData, category: cat.id })}
                                            className={clsx(
                                                "py-3 rounded-xl text-sm font-medium transition-all flex flex-col items-center gap-1",
                                                formData.category === cat.id
                                                    ? addFormType === 'offering'
                                                        ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50"
                                                        : "bg-orange-500/30 text-orange-300 border border-orange-500/50"
                                                    : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
                                            )}
                                        >
                                            <span className="text-xl">{cat.icon}</span>
                                            <span className="text-xs">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">
                                    {addFormType === 'offering' ? 'What are you offering?' : 'What do you need?'}
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder={addFormType === 'offering' ? 'e.g., Bottled water, First aid kit...' : 'e.g., Need flashlight, Looking for ride...'}
                                    className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Add more details about your offer or request..."
                                    rows={3}
                                    className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>

                            {/* Quantity */}
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-2 block">Quantity (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                    placeholder="e.g., 6 bottles, 2 seats, 1 room..."
                                    className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            {/* Location Notice */}
                            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center gap-3">
                                <MapPin size={18} className="text-blue-400 shrink-0" />
                                <p className="text-blue-300 text-sm">Your approximate location will be shared to help neighbors find you.</p>
                            </div>
                        </div>
                    )}

                    {/* Footer */}
                    {!showSuccess && (
                        <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                            <button
                                onClick={handleSubmit}
                                disabled={!formData.title.trim() || !formData.description.trim()}
                                className={clsx(
                                    "w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all",
                                    formData.title.trim() && formData.description.trim()
                                        ? addFormType === 'offering'
                                            ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white"
                                            : "bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white"
                                        : "bg-gray-600 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                <Plus size={18} />
                                {addFormType === 'offering' ? 'Post Offer' : 'Post Request'}
                            </button>
                        </div>
                    )}
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
                <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-green-600 p-4 z-10 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Share2 size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Resource Sharing</h2>
                                <p className="text-white/70 text-xs">{stats.offerings} offering • {stats.requests} requesting</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X size={18} className="text-white" />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4">
                        {[
                            { id: 'all', label: 'All' },
                            { id: 'offering', label: '🎁 Offering' },
                            { id: 'requesting', label: '🙏 Requesting' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as 'all' | 'offering' | 'requesting')}
                                className={clsx(
                                    "flex-1 py-2 rounded-xl text-sm font-medium transition-all",
                                    activeTab === tab.id
                                        ? "bg-white text-black"
                                        : "bg-white/10 text-white/70 hover:bg-white/20"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Categories */}
                <div className="px-4 py-3 border-b border-white/10 shrink-0">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1",
                                    selectedCategory === cat.id
                                        ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/50"
                                        : "bg-white/5 text-white/70 border border-white/10 hover:bg-white/10"
                                )}
                            >
                                <span>{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Resources List */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {filteredResources.map((resource) => (
                        <div
                            key={resource.id}
                            className={clsx(
                                "p-4 rounded-2xl border transition-all",
                                resource.claimed
                                    ? "bg-gray-500/10 border-gray-500/30 opacity-60"
                                    : resource.type === 'offering'
                                        ? "bg-emerald-500/10 border-emerald-500/30"
                                        : "bg-orange-500/10 border-orange-500/30"
                            )}
                        >
                            <div className="flex items-start gap-3">
                                <div className={clsx(
                                    "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
                                    resource.type === 'offering' ? "bg-emerald-500/20" : "bg-orange-500/20"
                                )}>
                                    {resource.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={clsx(
                                            "text-[10px] font-bold uppercase px-1.5 py-0.5 rounded",
                                            resource.type === 'offering'
                                                ? "bg-emerald-500/30 text-emerald-300"
                                                : "bg-orange-500/30 text-orange-300"
                                        )}>
                                            {resource.type === 'offering' ? 'Offering' : 'Requesting'}
                                        </span>
                                        {resource.claimed && (
                                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-green-500/30 text-green-300">
                                                {resource.type === 'offering' ? 'Claimed' : 'Help Offered'}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-white font-semibold mt-1">{resource.title}</h3>
                                    <p className="text-gray-400 text-sm mt-1">{resource.description}</p>

                                    {resource.quantity && (
                                        <p className="text-gray-500 text-xs mt-2">Quantity: {resource.quantity}</p>
                                    )}

                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-gray-500 text-xs flex items-center gap-1">
                                            <MapPin size={12} />
                                            {resource.distance}
                                        </span>
                                        <span className="text-gray-500 text-xs flex items-center gap-1">
                                            <Clock size={12} />
                                            {resource.timeAgo}
                                        </span>
                                        <span className="text-gray-400 text-xs">
                                            by {resource.postedBy}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {!resource.claimed && (
                                <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                                    <button
                                        onClick={() => openMessage(resource)}
                                        className="flex-1 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <MessageCircle size={16} />
                                        Message
                                    </button>
                                    {resource.type === 'offering' ? (
                                        <button
                                            onClick={() => handleClaim(resource.id)}
                                            className="flex-1 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-xl text-emerald-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Check size={16} />
                                            Claim
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleOfferHelp(resource.id)}
                                            className="flex-1 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl text-blue-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Heart size={16} />
                                            I Can Help
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {filteredResources.length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package size={32} className="text-gray-600" />
                            </div>
                            <p className="text-gray-400">No resources in this category</p>
                            <p className="text-gray-500 text-sm mt-1">Be the first to share!</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0 space-y-2">
                    <button
                        onClick={() => openAddForm('offering')}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus size={18} />
                        Share a Resource
                    </button>
                    <div className="flex gap-2">
                        <button
                            onClick={() => openAddForm('offering')}
                            className="flex-1 py-3 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-xl text-blue-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            🎁 Offer Help
                        </button>
                        <button
                            onClick={() => openAddForm('requesting')}
                            className="flex-1 py-3 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-400 text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                        >
                            🙏 Request Help
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
