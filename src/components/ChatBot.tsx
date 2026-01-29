import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, Bot, User, Loader2, Sparkles, AlertTriangle, MapPin, Package, Phone } from 'lucide-react';
import clsx from 'clsx';

interface Message {
    id: string;
    type: 'user' | 'bot';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
}

interface QuickAction {
    icon: React.ReactNode;
    label: string;
    query: string;
}

const QUICK_ACTIONS: QuickAction[] = [
    { icon: <MapPin size={14} />, label: 'Find shelter', query: 'Where is the nearest shelter?' },
    { icon: <AlertTriangle size={14} />, label: 'Current alerts', query: 'What are the current alerts in my area?' },
    { icon: <Package size={14} />, label: 'Emergency kit', query: 'What should I pack in my emergency kit?' },
    { icon: <Phone size={14} />, label: 'Emergency numbers', query: 'What are the important emergency numbers?' },
];

const BOT_RESPONSES: Record<string, string> = {
    'shelter': `🏠 **Nearest Shelters:**\n\n1. **Moscone Center** - 0.8 miles\n   747 Howard St • Capacity: Available\n   \n2. **SF General Hospital** - 1.2 miles\n   1001 Potrero Ave • Medical services available\n   \n3. **Twin Peaks Community Center** - 1.5 miles\n   Higher ground, suitable for flood evacuees\n\nWould you like me to navigate you to the nearest one?`,

    'alerts': `⚠️ **Current Alerts in Your Area:**\n\n🔴 **CRITICAL: Wildfire - Zone B**\nEvacuate immediately via Route 1\n\n🟠 **WARNING: Air Quality Alert**\nAQI: 180 (Unhealthy)\nWear N95 masks outdoors\n\n🟡 **ADVISORY: Flash Flood Watch**\nLow-lying areas until 8 PM\n\nStay safe and monitor for updates.`,

    'kit': `📦 **Essential Emergency Kit:**\n\n**Water & Food:**\n• 1 gallon water per person/day (3 days)\n• Non-perishable food\n• Manual can opener\n\n**Safety:**\n• First aid kit\n• Flashlight + batteries\n• N95/N99 masks\n• Fire extinguisher\n\n**Documents:**\n• ID copies\n• Insurance documents\n• Cash in small bills\n\n**Personal:**\n• Medications\n• Phone charger\n• Change of clothes\n\nWould you like me to add these to your checklist?`,

    'numbers': `📞 **Emergency Numbers:**\n\n🚨 **911** - Police/Fire/Medical\n🏥 **SF General Hospital** - (415) 206-8000\n🔥 **Fire Department** - (415) 558-3200\n⚡ **PG&E (Gas Leak)** - 1-800-743-5000\n💧 **Water Emergency** - (415) 551-4700\n🏠 **Red Cross** - 1-800-733-2767\n\nSave these to your emergency contacts for quick access.`,

    'default': `I'm here to help you stay safe during emergencies. Here's what I can help with:\n\n• 🗺️ Find nearby shelters and safe zones\n• ⚠️ Check current alerts and warnings\n• 📦 Emergency kit preparation\n• 📞 Important emergency numbers\n• 🚗 Evacuation route guidance\n\nWhat would you like to know?`
};

export function ChatBot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            type: 'bot',
            content: `👋 Hi! I'm your Guardian AI assistant. I'm here to help you stay safe during emergencies.\n\nHow can I help you today?`,
            timestamp: new Date(),
        }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const getBotResponse = (query: string): string => {
        const lowerQuery = query.toLowerCase();
        if (lowerQuery.includes('shelter') || lowerQuery.includes('safe') || lowerQuery.includes('nearest')) {
            return BOT_RESPONSES.shelter;
        }
        if (lowerQuery.includes('alert') || lowerQuery.includes('warning') || lowerQuery.includes('current')) {
            return BOT_RESPONSES.alerts;
        }
        if (lowerQuery.includes('kit') || lowerQuery.includes('pack') || lowerQuery.includes('emergency')) {
            return BOT_RESPONSES.kit;
        }
        if (lowerQuery.includes('number') || lowerQuery.includes('call') || lowerQuery.includes('phone')) {
            return BOT_RESPONSES.numbers;
        }
        return BOT_RESPONSES.default;
    };

    const handleSend = (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: messageText,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Simulate typing delay
        setTimeout(() => {
            const botMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'bot',
                content: getBotResponse(messageText),
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, botMessage]);
            setIsTyping(false);
        }, 1000 + Math.random() * 1000);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Floating button when closed
    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-24 right-4 z-50 group"
            >
                <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl animate-pulse" />
                <div className="relative w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40 border-2 border-blue-400/50 transition-transform hover:scale-110 active:scale-95">
                    <MessageCircle size={24} className="text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <Sparkles size={10} className="text-white" />
                </div>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full sm:max-w-md h-full sm:h-[600px] bg-[#1c1c1e] sm:rounded-3xl overflow-hidden border-0 sm:border border-white/10 shadow-2xl flex flex-col">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Bot size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold">Guardian AI</h2>
                            <p className="text-white/70 text-xs flex items-center gap-1">
                                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                Always ready to help
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <X size={18} className="text-white" />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={clsx(
                                "flex gap-3",
                                message.type === 'user' ? "flex-row-reverse" : ""
                            )}
                        >
                            <div className={clsx(
                                "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                                message.type === 'user'
                                    ? "bg-gradient-to-br from-purple-500 to-pink-500"
                                    : "bg-gradient-to-br from-blue-500 to-indigo-500"
                            )}>
                                {message.type === 'user' ? (
                                    <User size={16} className="text-white" />
                                ) : (
                                    <Bot size={16} className="text-white" />
                                )}
                            </div>
                            <div className={clsx(
                                "max-w-[80%] rounded-2xl p-3",
                                message.type === 'user'
                                    ? "bg-blue-500 text-white rounded-br-sm"
                                    : "bg-white/10 text-white rounded-bl-sm"
                            )}>
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                                <p className={clsx(
                                    "text-[10px] mt-1",
                                    message.type === 'user' ? "text-blue-200" : "text-gray-500"
                                )}>
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isTyping && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                                <Bot size={16} className="text-white" />
                            </div>
                            <div className="bg-white/10 rounded-2xl rounded-bl-sm p-3">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                <div className="px-4 py-2 border-t border-white/10 shrink-0">
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                        {QUICK_ACTIONS.map((action, i) => (
                            <button
                                key={i}
                                onClick={() => handleSend(action.query)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-white/70 whitespace-nowrap transition-colors"
                            >
                                {action.icon}
                                {action.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10 shrink-0">
                    <div className="flex gap-2">
                        <button className="w-10 h-10 bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0">
                            <Mic size={20} />
                        </button>
                        <div className="flex-1 relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me anything..."
                                className="w-full py-3 px-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 pr-12"
                            />
                        </div>
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim()}
                            className={clsx(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0",
                                input.trim()
                                    ? "bg-blue-500 hover:bg-blue-600 text-white"
                                    : "bg-white/5 text-gray-500"
                            )}
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
