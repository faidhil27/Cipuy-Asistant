"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  LogOut,
  Search,
  Check,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Conversation } from "./mobile-drawer";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  isAdmin: boolean;
  userEmail?: string;
  onLogout: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onOpenSettings,
  isAdmin,
  userEmail,
  onLogout,
}: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      className={`hidden md:flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-300 relative z-20 select-none ${
        isCollapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Collapse toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-8 z-30 bg-white border border-slate-200 hover:border-purple-300 text-slate-500 hover:text-purple-600 rounded-full p-1 shadow-sm transition-all"
        title={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>

      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image
                src="/images/cipuy-robot.png"
                alt="CIPUY"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-wide bg-gradient-to-r from-purple-700 to-indigo-600 bg-clip-text text-transparent">
                CIPUY AI
              </span>
              <div className="flex items-center gap-1.5">
                <span className="flex h-1.5 w-1.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Asisten Pribadi
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <div className="relative w-8 h-8">
              <Image
                src="/images/cipuy-robot.png"
                alt="CIPUY"
                fill
                className="object-contain"
              />
            </div>
          </div>
        )}
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-sm shadow-purple-200 hover:shadow transition-all active:scale-[0.98] ${
            isCollapsed ? "px-0" : "px-3"
          }`}
          title="Percakapan Baru"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          {!isCollapsed && <span className="text-xs font-semibold">Percakapan Baru</span>}
        </button>
      </div>

      {/* Search Bar (only in expanded mode) */}
      {!isCollapsed && (
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari obrolan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-2">
        {!isCollapsed && (
          <p className="px-2 text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Riwayat Chat
          </p>
        )}

        {filteredConversations.length === 0 ? (
          !isCollapsed && (
            <div className="text-center py-8 text-xs text-slate-400">
              Belum ada percakapan
            </div>
          )
        ) : (
          filteredConversations.map((conv) => {
            const isActive = conv.id === activeId;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all ${
                  isActive
                    ? "bg-purple-50 text-purple-900 font-semibold border border-purple-200/80 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                }`}
              >
                {isEditing ? (
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(conv.id);
                      }}
                      className="flex-1 px-1.5 py-0.5 text-xs border border-purple-400 rounded bg-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRename(conv.id)}
                      className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onSelectConversation(conv.id)}
                      className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
                      title={conv.title}
                    >
                      <MessageSquare
                        className={`w-4 h-4 flex-shrink-0 ${
                          isActive ? "text-purple-600" : "text-slate-400"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate">{conv.title}</span>
                      )}
                    </button>

                    {/* Actions (visible on hover) */}
                    {!isCollapsed && (
                      <div className="hidden group-hover:flex items-center gap-0.5 ml-1">
                        <button
                          onClick={() => startRename(conv)}
                          className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-100 rounded"
                          title="Ganti Judul"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteConversation(conv.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                          title="Hapus Percakapan"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Actions: Settings, Admin, User Profile */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50 space-y-1.5">
        {/* AI Settings Button */}
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors ${
            isCollapsed ? "justify-center" : ""
          }`}
          title="Pengaturan AI Cipuy"
        >
          <Settings className="w-4 h-4 flex-shrink-0 text-slate-500" />
          {!isCollapsed && <span>Pengaturan Cipuy</span>}
        </button>

        {/* Admin Dashboard Link */}
        {isAdmin && (
          <Link
            href="/admin"
            className={`w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-semibold text-purple-700 bg-purple-100/70 hover:bg-purple-200/80 rounded-xl transition-colors ${
              isCollapsed ? "justify-center" : ""
            }`}
            title="Dashboard Admin"
          >
            <ShieldCheck className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Panel Admin</span>}
          </Link>
        )}

        {/* User Card */}
        <div
          className={`flex items-center justify-between pt-2 border-t border-slate-200/60 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          {!isCollapsed ? (
            <>
              <div className="truncate pr-2">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {userEmail || "Tamu"}
                </p>
                <p className="text-[10px] text-slate-500">
                  {isAdmin ? "Status: Administrator" : "Pengguna Cipuy"}
                </p>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                title="Keluar / Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={onLogout}
              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

