import { useState } from 'react';
import { Phone, Plus, X, User, Heart, Edit2, Trash2, MapPin, MessageCircle } from 'lucide-react';
import clsx from 'clsx';

export interface EmergencyContact {
    id: string;
    name: string;
    phone: string;
    relationship: string;
    isPrimary: boolean;
    avatar?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const MOCK_CONTACTS: EmergencyContact[] = [
    { id: '1', name: 'Sarah Johnson', phone: '+1 (555) 123-4567', relationship: 'Spouse', isPrimary: true },
    { id: '2', name: 'Michael Chen', phone: '+1 (555) 987-6543', relationship: 'Brother', isPrimary: false },
    { id: '3', name: 'Dr. Emily Roberts', phone: '+1 (555) 456-7890', relationship: 'Doctor', isPrimary: false },
];

export function EmergencyContacts({ isOpen, onClose }: Props) {
    const [contacts, setContacts] = useState<EmergencyContact[]>(MOCK_CONTACTS);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '' });

    const handleCall = (phone: string) => {
        window.open(`tel:${phone.replace(/\D/g, '')}`);
    };

    const handleText = (phone: string) => {
        window.open(`sms:${phone.replace(/\D/g, '')}`);
    };

    const handleAddContact = () => {
        if (newContact.name && newContact.phone) {
            setContacts([...contacts, {
                id: Date.now().toString(),
                ...newContact,
                isPrimary: contacts.length === 0,
            }]);
            setNewContact({ name: '', phone: '', relationship: '' });
            setIsAdding(false);
        }
    };

    const handleDeleteContact = (id: string) => {
        setContacts(contacts.filter(c => c.id !== id));
    };

    const handleSetPrimary = (id: string) => {
        setContacts(contacts.map(c => ({ ...c, isPrimary: c.id === id })));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
            <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[85vh] overflow-hidden border border-white/10 shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-[#1c1c1e] border-b border-white/10 p-4 flex items-center justify-between z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                            <Phone size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-lg">Emergency Contacts</h2>
                            <p className="text-gray-500 text-xs">{contacts.length} contacts saved</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <X size={18} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <button
                            onClick={() => handleCall('911')}
                            className="py-4 bg-gradient-to-r from-red-500 to-red-600 rounded-2xl flex flex-col items-center gap-1 hover:brightness-110 transition-all active:scale-[0.98]"
                        >
                            <Phone size={24} className="text-white" />
                            <span className="text-white font-bold">Call 911</span>
                            <span className="text-white/60 text-xs">Emergency Services</span>
                        </button>
                        <button
                            onClick={() => contacts[0] && handleCall(contacts[0].phone)}
                            className="py-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex flex-col items-center gap-1 hover:brightness-110 transition-all active:scale-[0.98]"
                        >
                            <Heart size={24} className="text-white" />
                            <span className="text-white font-bold">Call Primary</span>
                            <span className="text-white/60 text-xs">{contacts.find(c => c.isPrimary)?.name || 'Not set'}</span>
                        </button>
                    </div>

                    {/* Contacts List */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Your Contacts</p>
                            <button
                                onClick={() => setIsAdding(true)}
                                className="flex items-center gap-1 text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors"
                            >
                                <Plus size={16} />
                                Add
                            </button>
                        </div>

                        {contacts.map((contact) => (
                            <div
                                key={contact.id}
                                className={clsx(
                                    "p-4 rounded-2xl border transition-all",
                                    contact.isPrimary
                                        ? "bg-blue-500/10 border-blue-500/30"
                                        : "bg-white/5 border-white/10 hover:bg-white/10"
                                )}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold",
                                        contact.isPrimary
                                            ? "bg-blue-500 text-white"
                                            : "bg-gray-700 text-gray-300"
                                    )}>
                                        {contact.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-white font-semibold truncate">{contact.name}</h3>
                                            {contact.isPrimary && (
                                                <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 text-[10px] font-bold rounded-full uppercase">
                                                    Primary
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-gray-400 text-sm">{contact.phone}</p>
                                        <p className="text-gray-500 text-xs mt-0.5">{contact.relationship}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                                    <button
                                        onClick={() => handleCall(contact.phone)}
                                        className="flex-1 py-2 bg-green-500/20 hover:bg-green-500/30 rounded-xl flex items-center justify-center gap-2 text-green-400 text-sm font-medium transition-colors"
                                    >
                                        <Phone size={16} />
                                        Call
                                    </button>
                                    <button
                                        onClick={() => handleText(contact.phone)}
                                        className="flex-1 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-xl flex items-center justify-center gap-2 text-blue-400 text-sm font-medium transition-colors"
                                    >
                                        <MessageCircle size={16} />
                                        Text
                                    </button>
                                    {!contact.isPrimary && (
                                        <button
                                            onClick={() => handleSetPrimary(contact.id)}
                                            className="py-2 px-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 text-sm transition-colors"
                                        >
                                            <Heart size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDeleteContact(contact.id)}
                                        className="py-2 px-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl text-red-400 text-sm transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}

                        {/* Add Contact Form */}
                        {isAdding && (
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                                <p className="text-sm font-semibold text-white">Add New Contact</p>
                                <input
                                    type="text"
                                    placeholder="Name"
                                    value={newContact.name}
                                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                    className="w-full py-3 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="tel"
                                    placeholder="Phone Number"
                                    value={newContact.phone}
                                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                                    className="w-full py-3 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                                />
                                <input
                                    type="text"
                                    placeholder="Relationship (e.g., Spouse, Parent)"
                                    value={newContact.relationship}
                                    onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                                    className="w-full py-3 px-4 bg-black/30 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setIsAdding(false)}
                                        className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-medium transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddContact}
                                        className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-colors"
                                    >
                                        Add Contact
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4">
                    <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                        <MapPin size={18} className="text-yellow-400 shrink-0" />
                        <p className="text-xs text-yellow-300/80">
                            Your location will be shared with these contacts during an emergency
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
