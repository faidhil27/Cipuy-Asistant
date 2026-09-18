"use client";

import Image from "next/image";
import { Menu, Plus, Settings, Sparkles } from "lucide-react";

interface MobileHeaderProps {
  onOpenDrawer: () => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  currentTitle?: string;
}

export function MobileHeader({
  onOpenDrawer,
  onNewChat,
  onOpenSettings,
  currentTitle = "Cipuy AI",
}: MobileHeaderProps) {
  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-3.5 py-2.5 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      {/* Left: Menu button to open sidebar drawer */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenDrawer}
          className="p-2 -ml-1 text-slate-700 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400"
          title="Buka Menu Riwayat"
          aria-label="Buka Menu Riwayat"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Logo and Status */}
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-purple-200 bg-purple-50">
            <Image
              src="/images/cipuy-robot.png"
              alt="Cipuy Robot"
              fill
              className="object-cover p-0.5"
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight text-slate-900">CIPUY</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-none truncate max-w-[140px]">
              {currentTitle}
            </p>
          </div>
        </div>
      </div>

      {/* Right actions: New Chat & Settings */}
      <div className="flex items-center gap-1">
        <button
          onClick={onOpenSettings}
          className="p-2 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors"
          title="Pengaturan AI"
          aria-label="Pengaturan AI"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          onClick={onNewChat}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95"
          title="Chat Baru"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Baru</span>
        </button>
      </div>
    </header>
  );
}

