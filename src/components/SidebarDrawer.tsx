import { X, Home, Map, Bell, Users, Package, Shield, Settings, Phone, Heart, Share2, HelpCircle, FileText, ChevronRight, Building2 } from 'lucide-react';
import clsx from 'clsx';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (screen: string) => void;
}

interface MenuItem {
    id: string;
    icon: React.ReactNode;
    label: string;
    description?: string;
    badge?: string;
    color?: string;
}

interface MenuSection {
    title: string;
    items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
    {
        title: 'Quick Access',
        items: [
            { id: 'home', icon: <Home size={20} />, label: 'Home', description: 'Dashboard overview' },
            { id: 'map', icon: <Map size={20} />, label: 'Map & Navigation', description: 'Evacuation routes' },
            { id: 'alerts', icon: <Bell size={20} />, label: 'Alerts', description: 'Emergency notifications', badge: '3' },
        ]
    },
    {
        title: 'Emergency',
        items: [
            { id: 'sos', icon: <Phone size={20} />, label: 'Emergency Contacts', description: 'Quick dial contacts', color: 'red' },
            { id: 'family', icon: <Users size={20} />, label: 'Family Status', description: 'Check-in with family', color: 'purple' },
            { id: 'nearby-resources', icon: <Building2 size={20} />, label: 'Nearby Resources', description: 'Shelters, hospitals & more', color: 'blue' },
        ]
    },
    {
        title: 'Community',
        items: [
            { id: 'neighbors', icon: <Heart size={20} />, label: 'Neighbor Network', description: 'Community safety' },
            { id: 'resources', icon: <Share2 size={20} />, label: 'Resource Sharing', description: 'Mutual aid' },
        ]
    },
    {
        title: 'Preparedness',
        items: [
            { id: 'kit', icon: <Package size={20} />, label: 'Emergency Kit', description: 'Checklist & supplies' },
            { id: 'documents', icon: <FileText size={20} />, label: 'Documents', description: 'Important files' },
        ]
    },
];

export function SidebarDrawer({ isOpen, onClose, onNavigate }: Props) {
    if (!isOpen) return null;

    const handleItemClick = (id: string) => {
        onNavigate(id);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={clsx(
                "fixed left-0 top-0 bottom-0 z-[95] w-80 bg-[#1a1a1a] border-r border-white/10 shadow-2xl",
                "transform transition-transform duration-300 ease-out",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                {/* Header */}
                <div className="p-5 border-b border-white/10 bg-gradient-to-r from-blue-600/20 to-purple-600/20">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                                <Shield size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Guardian AI</h2>
                                <p className="text-gray-400 text-xs">Personal Disaster Assistant</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X size={18} className="text-white" />
                        </button>
                    </div>

                    {/* User Profile Quick Access */}
                    <button
                        onClick={() => handleItemClick('profile')}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                            P
                        </div>
                        <div className="flex-1 text-left">
                            <p className="text-white font-medium">Pratik</p>
                            <p className="text-gray-500 text-xs">San Francisco, CA</p>
                        </div>
                        <ChevronRight size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Menu Sections */}
                <div className="overflow-y-auto h-[calc(100%-220px)] py-2">
                    {MENU_SECTIONS.map((section, sectionIndex) => (
                        <div key={sectionIndex} className="px-3 py-2">
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold px-3 mb-2">
                                {section.title}
                            </p>
                            <div className="space-y-1">
                                {section.items.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleItemClick(item.id)}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-white/5 rounded-xl transition-colors group"
                                    >
                                        <div className={clsx(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                                            item.color === 'red' ? "bg-red-500/20 text-red-400 group-hover:bg-red-500/30" :
                                                item.color === 'purple' ? "bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30" :
                                                    item.color === 'blue' ? "bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30" :
                                                        "bg-white/10 text-gray-400 group-hover:bg-white/20"
                                        )}>
                                            {item.icon}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="text-white font-medium text-sm">{item.label}</p>
                                            {item.description && (
                                                <p className="text-gray-500 text-xs">{item.description}</p>
                                            )}
                                        </div>
                                        {item.badge && (
                                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full">
                                                {item.badge}
                                            </span>
                                        )}
                                        <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400 transition-colors" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10 bg-[#1a1a1a]">
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleItemClick('settings')}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <Settings size={18} className="text-gray-400" />
                            <span className="text-gray-300 text-sm">Settings</span>
                        </button>
                        <button
                            onClick={() => handleItemClick('help')}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <HelpCircle size={18} className="text-gray-400" />
                            <span className="text-gray-300 text-sm">Help</span>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
