import { useState } from 'react';
import { X, Check, Package, Droplets, Heart, FileText, Shirt, Battery, Plus, Trash2, Calendar, ChevronDown, ChevronUp, ShoppingCart, ChevronLeft, Copy, Share } from 'lucide-react';
import clsx from 'clsx';

interface KitItem {
    id: string;
    name: string;
    category: string;
    checked: boolean;
    quantity: number;
    expirationDate?: string;
}

interface Category {
    id: string;
    name: string;
    icon: React.ReactNode;
    color: string;
    items: KitItem[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const INITIAL_CATEGORIES: Category[] = [
    {
        id: 'water',
        name: 'Water & Food',
        icon: <Droplets size={18} />,
        color: 'blue',
        items: [
            { id: '1', name: 'Water (1 gal/person/day)', category: 'water', checked: true, quantity: 6 },
            { id: '2', name: 'Canned food', category: 'water', checked: true, quantity: 12 },
            { id: '3', name: 'Manual can opener', category: 'water', checked: false, quantity: 1 },
            { id: '4', name: 'Non-perishable snacks', category: 'water', checked: true, quantity: 8 },
        ]
    },
    {
        id: 'medical',
        name: 'Medical & First Aid',
        icon: <Heart size={18} />,
        color: 'red',
        items: [
            { id: '5', name: 'First aid kit', category: 'medical', checked: true, quantity: 1 },
            { id: '6', name: 'Prescription medications', category: 'medical', checked: false, quantity: 1, expirationDate: '2025-06' },
            { id: '7', name: 'N95/N99 masks', category: 'medical', checked: true, quantity: 10 },
            { id: '8', name: 'Hand sanitizer', category: 'medical', checked: true, quantity: 3 },
            { id: '9', name: 'Pain relievers', category: 'medical', checked: false, quantity: 1 },
        ]
    },
    {
        id: 'tools',
        name: 'Tools & Safety',
        icon: <Battery size={18} />,
        color: 'yellow',
        items: [
            { id: '10', name: 'Flashlight', category: 'tools', checked: true, quantity: 2 },
            { id: '11', name: 'Extra batteries', category: 'tools', checked: false, quantity: 8 },
            { id: '12', name: 'Portable phone charger', category: 'tools', checked: true, quantity: 1 },
            { id: '13', name: 'Fire extinguisher', category: 'tools', checked: false, quantity: 1 },
            { id: '14', name: 'Whistle', category: 'tools', checked: false, quantity: 2 },
        ]
    },
    {
        id: 'documents',
        name: 'Documents',
        icon: <FileText size={18} />,
        color: 'purple',
        items: [
            { id: '15', name: 'ID copies', category: 'documents', checked: true, quantity: 2 },
            { id: '16', name: 'Insurance documents', category: 'documents', checked: false, quantity: 1 },
            { id: '17', name: 'Cash (small bills)', category: 'documents', checked: true, quantity: 1 },
            { id: '18', name: 'Emergency contact list', category: 'documents', checked: true, quantity: 1 },
        ]
    },
    {
        id: 'clothing',
        name: 'Clothing & Personal',
        icon: <Shirt size={18} />,
        color: 'green',
        items: [
            { id: '19', name: 'Change of clothes', category: 'clothing', checked: false, quantity: 2 },
            { id: '20', name: 'Sturdy shoes', category: 'clothing', checked: true, quantity: 1 },
            { id: '21', name: 'Rain poncho', category: 'clothing', checked: false, quantity: 2 },
            { id: '22', name: 'Blanket/sleeping bag', category: 'clothing', checked: true, quantity: 2 },
        ]
    }
];

const colorMap: Record<string, { bg: string; border: string; text: string; light: string }> = {
    blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-400', light: 'bg-blue-500/10' },
    red: { bg: 'bg-red-500/20', border: 'border-red-500/30', text: 'text-red-400', light: 'bg-red-500/10' },
    yellow: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', text: 'text-yellow-400', light: 'bg-yellow-500/10' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-400', light: 'bg-purple-500/10' },
    green: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-400', light: 'bg-green-500/10' },
};

type ViewType = 'checklist' | 'shopping-list';

export function EmergencyKit({ isOpen, onClose }: Props) {
    const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
    const [expandedCategory, setExpandedCategory] = useState<string | null>('water');
    const [showAddItem, setShowAddItem] = useState<string | null>(null);
    const [newItemName, setNewItemName] = useState('');
    const [currentView, setCurrentView] = useState<ViewType>('checklist');
    const [copied, setCopied] = useState(false);

    const totalItems = categories.reduce((acc, cat) => acc + cat.items.length, 0);
    const checkedItems = categories.reduce((acc, cat) => acc + cat.items.filter(i => i.checked).length, 0);
    const progress = Math.round((checkedItems / totalItems) * 100);

    const toggleItem = (categoryId: string, itemId: string) => {
        setCategories(categories.map(cat => {
            if (cat.id === categoryId) {
                return {
                    ...cat,
                    items: cat.items.map(item =>
                        item.id === itemId ? { ...item, checked: !item.checked } : item
                    )
                };
            }
            return cat;
        }));
    };

    const addItem = (categoryId: string) => {
        if (!newItemName.trim()) return;

        setCategories(categories.map(cat => {
            if (cat.id === categoryId) {
                return {
                    ...cat,
                    items: [...cat.items, {
                        id: Date.now().toString(),
                        name: newItemName,
                        category: categoryId,
                        checked: false,
                        quantity: 1
                    }]
                };
            }
            return cat;
        }));
        setNewItemName('');
        setShowAddItem(null);
    };

    const deleteItem = (categoryId: string, itemId: string) => {
        setCategories(categories.map(cat => {
            if (cat.id === categoryId) {
                return {
                    ...cat,
                    items: cat.items.filter(item => item.id !== itemId)
                };
            }
            return cat;
        }));
    };

    // Get unchecked items grouped by category
    const getUncheckedByCategory = () => {
        return categories.map(cat => ({
            ...cat,
            items: cat.items.filter(i => !i.checked)
        })).filter(cat => cat.items.length > 0);
    };

    const uncheckedItems = categories.flatMap(cat => cat.items.filter(i => !i.checked));
    const uncheckedByCategory = getUncheckedByCategory();

    // Generate shopping list text
    const generateShoppingListText = () => {
        let text = '🛒 Emergency Kit Shopping List\n';
        text += `📅 Generated: ${new Date().toLocaleDateString()}\n\n`;

        uncheckedByCategory.forEach(cat => {
            text += `📦 ${cat.name}\n`;
            cat.items.forEach(item => {
                text += `  ☐ ${item.name} (x${item.quantity})\n`;
            });
            text += '\n';
        });

        text += `\nTotal: ${uncheckedItems.length} items needed`;
        return text;
    };

    const copyToClipboard = async () => {
        const text = generateShoppingListText();
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const shareList = async () => {
        const text = generateShoppingListText();
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Emergency Kit Shopping List',
                    text: text
                });
            } catch (err) {
                console.error('Share failed:', err);
            }
        } else {
            copyToClipboard();
        }
    };

    const markAsPurchased = (categoryId: string, itemId: string) => {
        toggleItem(categoryId, itemId);
    };

    if (!isOpen) return null;

    // Shopping List View
    if (currentView === 'shopping-list') {
        return (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
                <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="sticky top-0 bg-gradient-to-r from-emerald-600 to-teal-600 p-4 z-10 shrink-0">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setCurrentView('checklist')}
                                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft size={18} className="text-white" />
                            </button>
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <ShoppingCart size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Shopping List</h2>
                                <p className="text-white/70 text-xs">{uncheckedItems.length} items to purchase</p>
                            </div>
                        </div>
                    </div>

                    {uncheckedItems.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8">
                            <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                <Check size={40} className="text-green-400" />
                            </div>
                            <h3 className="text-white font-bold text-xl mb-2">All Set! 🎉</h3>
                            <p className="text-gray-400 text-center">Your emergency kit is complete. You're prepared for emergencies!</p>
                            <button
                                onClick={() => setCurrentView('checklist')}
                                className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
                            >
                                Back to Checklist
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Shopping Items by Category */}
                            <div className="overflow-y-auto flex-1 p-4 space-y-4">
                                {uncheckedByCategory.map((category) => {
                                    const colors = colorMap[category.color];
                                    return (
                                        <div key={category.id} className={clsx("rounded-2xl border overflow-hidden", colors.border)}>
                                            <div className={clsx("p-3 flex items-center gap-3", colors.light)}>
                                                <div className={clsx("w-8 h-8 rounded-lg flex items-center justify-center", colors.bg)}>
                                                    <span className={colors.text}>{category.icon}</span>
                                                </div>
                                                <h3 className="text-white font-semibold text-sm">{category.name}</h3>
                                                <span className="ml-auto text-xs text-gray-500">{category.items.length} items</span>
                                            </div>
                                            <div className="px-4 pb-3 space-y-2">
                                                {category.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                                                    >
                                                        <div className="w-6 h-6 rounded-lg border-2 border-gray-600 flex items-center justify-center">
                                                            <span className="text-gray-400 text-xs">☐</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-white text-sm">{item.name}</p>
                                                        </div>
                                                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                                                            x{item.quantity}
                                                        </span>
                                                        <button
                                                            onClick={() => markAsPurchased(category.id, item.id)}
                                                            className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 rounded-lg text-green-400 text-xs font-medium transition-colors"
                                                        >
                                                            Purchased
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Tips */}
                                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl">
                                    <h4 className="text-blue-300 font-semibold text-sm mb-2">💡 Shopping Tips</h4>
                                    <ul className="text-blue-300/70 text-xs space-y-1">
                                        <li>• Check expiration dates before purchasing</li>
                                        <li>• Buy waterproof containers for documents</li>
                                        <li>• Consider bulk buying for frequently used items</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0 space-y-2">
                                <div className="flex gap-2">
                                    <button
                                        onClick={copyToClipboard}
                                        className={clsx(
                                            "flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all",
                                            copied
                                                ? "bg-green-500 text-white"
                                                : "bg-white/10 hover:bg-white/20 text-white"
                                        )}
                                    >
                                        {copied ? <Check size={18} /> : <Copy size={18} />}
                                        {copied ? 'Copied!' : 'Copy List'}
                                    </button>
                                    <button
                                        onClick={shareList}
                                        className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Share size={18} />
                                        Share
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    }

    // Main Checklist View
    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center">
            <div className="w-full max-w-md bg-[#1c1c1e] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-amber-600 to-orange-600 p-4 z-10 shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                <Package size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-white font-bold text-lg">Emergency Kit</h2>
                                <p className="text-white/70 text-xs">{checkedItems} of {totalItems} items ready</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                        >
                            <X size={18} className="text-white" />
                        </button>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-white/80 text-sm">Preparedness</span>
                            <span className="text-white font-bold">{progress}%</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className={clsx(
                                    "h-full transition-all duration-500 rounded-full",
                                    progress >= 80 ? "bg-green-400" : progress >= 50 ? "bg-yellow-400" : "bg-red-400"
                                )}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Categories */}
                <div className="overflow-y-auto flex-1 p-4 space-y-3">
                    {categories.map((category) => {
                        const colors = colorMap[category.color];
                        const isExpanded = expandedCategory === category.id;
                        const categoryChecked = category.items.filter(i => i.checked).length;

                        return (
                            <div key={category.id} className={clsx("rounded-2xl border overflow-hidden", colors.border)}>
                                <button
                                    onClick={() => setExpandedCategory(isExpanded ? null : category.id)}
                                    className={clsx("w-full p-4 flex items-center gap-3", colors.light)}
                                >
                                    <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center", colors.bg)}>
                                        <span className={colors.text}>{category.icon}</span>
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="text-white font-semibold">{category.name}</h3>
                                        <p className="text-gray-500 text-xs">{categoryChecked}/{category.items.length} items</p>
                                    </div>
                                    {isExpanded ? (
                                        <ChevronUp size={20} className="text-gray-400" />
                                    ) : (
                                        <ChevronDown size={20} className="text-gray-400" />
                                    )}
                                </button>

                                {isExpanded && (
                                    <div className="px-4 pb-4 space-y-2">
                                        {category.items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center gap-3 p-3 bg-white/5 rounded-xl group"
                                            >
                                                <button
                                                    onClick={() => toggleItem(category.id, item.id)}
                                                    className={clsx(
                                                        "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                        item.checked
                                                            ? "bg-green-500 border-green-500"
                                                            : "border-gray-600 hover:border-gray-400"
                                                    )}
                                                >
                                                    {item.checked && <Check size={14} className="text-white" />}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <p className={clsx(
                                                        "text-sm transition-all",
                                                        item.checked ? "text-gray-500 line-through" : "text-white"
                                                    )}>
                                                        {item.name}
                                                    </p>
                                                    {item.expirationDate && (
                                                        <p className="text-xs text-yellow-400 flex items-center gap-1 mt-0.5">
                                                            <Calendar size={10} />
                                                            Exp: {item.expirationDate}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded">
                                                    x{item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => deleteItem(category.id, item.id)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-500/20 rounded transition-all"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}

                                        {showAddItem === category.id ? (
                                            <div className="flex gap-2 mt-2">
                                                <input
                                                    type="text"
                                                    value={newItemName}
                                                    onChange={(e) => setNewItemName(e.target.value)}
                                                    placeholder="Item name..."
                                                    className="flex-1 py-2 px-3 bg-black/30 border border-white/10 rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500"
                                                    autoFocus
                                                    onKeyPress={(e) => e.key === 'Enter' && addItem(category.id)}
                                                />
                                                <button
                                                    onClick={() => addItem(category.id)}
                                                    className="px-4 bg-blue-500 hover:bg-blue-600 rounded-xl text-white text-sm font-medium transition-colors"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setShowAddItem(category.id)}
                                                className="w-full py-2 border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl text-gray-500 text-sm flex items-center justify-center gap-2 transition-colors"
                                            >
                                                <Plus size={16} />
                                                Add item
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-[#1c1c1e] border-t border-white/10 p-4 shrink-0">
                    <button
                        onClick={() => setCurrentView('shopping-list')}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-2xl text-white font-semibold flex items-center justify-center gap-2 transition-all"
                    >
                        <ShoppingCart size={18} />
                        Generate Shopping List ({uncheckedItems.length} items)
                    </button>
                </div>
            </div>
        </div>
    );
}
