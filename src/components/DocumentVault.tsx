import { useState } from 'react';
import { X, FileText, Plus, Upload, FolderOpen, Shield, Share2, Download, ChevronRight, Search, Camera } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface Document {
    id: string;
    name: string;
    category: DocumentCategory;
    dateAdded: string;
    shared: boolean;
    thumbnail?: string;
}

type DocumentCategory = 'id' | 'insurance' | 'medical' | 'property' | 'other';

const CATEGORIES = [
    { id: 'all', label: 'All Documents', icon: '📁' },
    { id: 'id', label: 'Identification', icon: '🪪' },
    { id: 'insurance', label: 'Insurance', icon: '📋' },
    { id: 'medical', label: 'Medical', icon: '🏥' },
    { id: 'property', label: 'Property', icon: '🏠' },
    { id: 'other', label: 'Other', icon: '📄' },
];

const MOCK_DOCUMENTS: Document[] = [
    { id: '1', name: "Driver's License", category: 'id', dateAdded: '2 months ago', shared: true },
    { id: '2', name: "Passport", category: 'id', dateAdded: '6 months ago', shared: true },
    { id: '3', name: "Home Insurance Policy", category: 'insurance', dateAdded: '1 month ago', shared: false },
    { id: '4', name: "Auto Insurance Card", category: 'insurance', dateAdded: '3 weeks ago', shared: false },
    { id: '5', name: "Medical Records", category: 'medical', dateAdded: '2 weeks ago', shared: true },
    { id: '6', name: "Prescriptions List", category: 'medical', dateAdded: '1 week ago', shared: true },
    { id: '7', name: "Property Deed", category: 'property', dateAdded: '1 year ago', shared: false },
    { id: '8', name: "Birth Certificate", category: 'id', dateAdded: '2 years ago', shared: true },
];

const getCategoryColor = (category: DocumentCategory) => {
    switch (category) {
        case 'id': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
        case 'insurance': return 'bg-green-500/20 text-green-400 border-green-500/30';
        case 'medical': return 'bg-red-500/20 text-red-400 border-red-500/30';
        case 'property': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
        default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
};

const getCategoryIcon = (category: DocumentCategory) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat?.icon || '📄';
};

export function DocumentVault({ isOpen, onClose }: Props) {
    const [documents] = useState<Document[]>(MOCK_DOCUMENTS);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showUploadModal, setShowUploadModal] = useState(false);

    if (!isOpen) return null;

    const filteredDocs = documents.filter(doc => {
        if (selectedCategory !== 'all' && doc.category !== selectedCategory) return false;
        if (searchQuery && !doc.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const docsByCategory = CATEGORIES.slice(1).map(cat => ({
        ...cat,
        count: documents.filter(d => d.category === cat.id).length
    }));

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
            <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="shrink-0 bg-gradient-to-r from-amber-600 to-orange-600 p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <FileText size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Document Vault</h2>
                                <p className="text-white/70 text-xs">{documents.length} documents • Encrypted</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X size={18} className="text-white" />
                        </button>
                    </div>

                    {/* Offline Badge */}
                    <div className="mt-3 px-2.5 py-1.5 bg-white/10 rounded-lg inline-flex items-center gap-2">
                        <Shield size={14} className="text-green-400" />
                        <span className="text-white/80 text-xs">Available offline • Encrypted storage</span>
                    </div>
                </div>

                {/* Search */}
                <div className="shrink-0 px-4 py-3 border-b border-white/10">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-amber-500/50"
                        />
                    </div>
                </div>

                {/* Category Pills */}
                <div className="shrink-0 px-4 py-2 border-b border-white/10 overflow-x-auto hide-scrollbar">
                    <div className="flex gap-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setSelectedCategory(cat.id)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5",
                                    selectedCategory === cat.id
                                        ? "bg-amber-500 text-white"
                                        : "bg-white/10 text-gray-400 hover:bg-white/20"
                                )}
                            >
                                <span>{cat.icon}</span>
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Documents List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {selectedCategory === 'all' ? (
                        // Category Overview
                        <div className="space-y-3">
                            {docsByCategory.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    className="w-full p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-3 transition-colors"
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg",
                                        getCategoryColor(cat.id as DocumentCategory)
                                    )}>
                                        {cat.icon}
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-white text-sm font-medium">{cat.label}</p>
                                        <p className="text-gray-500 text-xs">{cat.count} document{cat.count !== 1 ? 's' : ''}</p>
                                    </div>
                                    <ChevronRight size={16} className="text-gray-500" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        // Document List
                        <div className="space-y-2">
                            {filteredDocs.length === 0 ? (
                                <div className="text-center py-12">
                                    <FolderOpen size={40} className="text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-500 text-sm">No documents found</p>
                                </div>
                            ) : (
                                filteredDocs.map(doc => (
                                    <div
                                        key={doc.id}
                                        className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={clsx(
                                                "w-10 h-10 rounded-lg flex items-center justify-center text-lg border",
                                                getCategoryColor(doc.category)
                                            )}>
                                                {getCategoryIcon(doc.category)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-gray-500 text-xs">{doc.dateAdded}</span>
                                                    {doc.shared && (
                                                        <span className="text-blue-400 text-xs flex items-center gap-1">
                                                            <Share2 size={10} />
                                                            Shared
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                                    <Share2 size={14} className="text-gray-400" />
                                                </button>
                                                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                                    <Download size={14} className="text-gray-400" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Add Document Button */}
                <div className="shrink-0 p-4 border-t border-white/10">
                    <button
                        onClick={() => setShowUploadModal(true)}
                        className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus size={18} />
                        Add Document
                    </button>
                </div>

                {/* Upload Modal */}
                {showUploadModal && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-[#2c2c2e] rounded-2xl p-4 w-full max-w-sm border border-white/10">
                            <h3 className="text-white font-bold text-lg mb-4">Add Document</h3>
                            <div className="space-y-3">
                                <button className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-3 transition-colors">
                                    <Camera size={20} className="text-blue-400" />
                                    <div className="text-left">
                                        <p className="text-white text-sm font-medium">Take Photo</p>
                                        <p className="text-gray-500 text-xs">Capture document with camera</p>
                                    </div>
                                </button>
                                <button className="w-full p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center gap-3 transition-colors">
                                    <Upload size={20} className="text-green-400" />
                                    <div className="text-left">
                                        <p className="text-white text-sm font-medium">Upload File</p>
                                        <p className="text-gray-500 text-xs">Select from your device</p>
                                    </div>
                                </button>
                            </div>
                            <button
                                onClick={() => setShowUploadModal(false)}
                                className="w-full mt-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white text-sm font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
