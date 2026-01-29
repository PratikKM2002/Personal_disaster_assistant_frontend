import { Menu, Bell, User, Shield } from 'lucide-react';

export function Header() {
    return (
        <header className="h-16 bg-[#111113] border-b border-white/10 flex items-center justify-between px-6 shrink-0">
            {/* Left - Logo */}
            <div className="flex items-center gap-4">
                <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                    <Menu size={20} className="text-gray-400" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center">
                        <Shield size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white leading-none">Guardian AI</h1>
                        <p className="text-xs text-gray-500">Personal Disaster Assistant</p>
                    </div>
                </div>
            </div>

            {/* Center - Location */}
            <div className="hidden md:flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-gray-300">San Francisco, CA</span>
            </div>

            {/* Right - Actions */}
            <div className="flex items-center gap-3">
                <button className="relative p-2.5 hover:bg-white/5 rounded-xl transition-colors">
                    <Bell size={20} className="text-gray-400" />
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#111113]" />
                </button>
                <button className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-xl transition-colors">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                        <User size={16} className="text-white" />
                    </div>
                    <span className="hidden sm:block text-sm text-gray-300">Pratik</span>
                </button>
            </div>
        </header>
    );
}
