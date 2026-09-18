"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  X,
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  LogOut,
  Search,
  Check,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  isAdmin: boolean;
  userEmail?: string;
  onLogout: () => void;
}

export function MobileDrawer({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  isAdmin,
  userEmail,
  onLogout,
}: MobileDrawerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 border-r border-slate-200 animate-in slide-in-from-left duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative w-7 h-7">
              <Image
                src="/images/cipuy-robot.png"
                alt="CIPUY"
                fill
                className="object-contain"
              />
            </div>
            <span className="font-extrabold text-base tracking-wide text-slate-900">
              CIPUY AI
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            aria-label="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New chat action */}
        <div className="p-3 border-b border-slate-100">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl shadow-sm hover:opacity-95 transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Chat Baru</span>
          </button>
        </div>

        {/* Search chat */}
        <div className="px-3 pt-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari obrolan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          <p className="px-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Riwayat Obrolan
          </p>
          {filteredConversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Belum ada percakapan
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeId;
              const isEditing = editingId === conv.id;

              return (
                <div
                  key={conv.id}
                  className={`group relative flex items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-all ${
                    isActive
                      ? "bg-purple-50 text-purple-900 font-medium border border-purple-200/70"
                      : "text-slate-700 hover:bg-slate-50 border border-transparent"
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
                        onClick={() => {
                          onSelectConversation(conv.id);
                          onClose();
                        }}
                        className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      >
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 text-purple-600" />
                        <span className="truncate">{conv.title}</span>
                      </button>

                      {/* Rename / Delete buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startRename(conv)}
                          className="p-1 text-slate-400 hover:text-purple-600 rounded"
                          title="Ganti Nama"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => onDeleteConversation(conv.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          title="Hapus"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer: Admin & Profile */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 space-y-2">
          {isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-purple-700 bg-purple-100/70 hover:bg-purple-200 rounded-xl transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Panel Khusus Admin</span>
            </Link>
          )}

          <div className="flex items-center justify-between pt-1">
            <div className="truncate pr-2">
              <p className="text-xs font-medium text-slate-800 truncate">
                {userEmail || "Tamu"}
              </p>
              <p className="text-[10px] text-slate-500">
                {isAdmin ? "Status: Administrator" : "Pengguna Cipuy"}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

