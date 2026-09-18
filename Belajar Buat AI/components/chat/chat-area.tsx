"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { MessageItem, ChatMessage } from "./chat-message";
import { PromptSuggestions } from "./prompt-suggestions";
import { Sparkles, Download, Trash2, Settings } from "lucide-react";

interface ChatAreaProps {
  messages: MessageItem[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onRegenerate: () => void;
  onOpenSettings: () => void;
  onExport: (format: "markdown" | "json" | "txt") => void;
  onClear: () => void;
  activeTitle?: string;
}

export function ChatArea({
  messages,
  isLoading,
  onSendMessage,
  onRegenerate,
  onOpenSettings,
  onExport,
  onClear,
  activeTitle = "Percakapan Baru",
}: ChatAreaProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
      {/* Desktop Sub-header Toolbar */}
      <div className="hidden md:flex items-center justify-between px-6 py-2.5 border-b border-slate-200/80 bg-white/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-800 truncate max-w-sm">
            {activeTitle}
          </span>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onExport("markdown")}
            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium"
            title="Download Percakapan (.md)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Export</span>
          </button>
          <button
            onClick={() => {
              if (confirm("Kosongkan semua pesan di obrolan ini?")) {
                onClear();
              }
            }}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium"
            title="Kosongkan Obrolan"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Bersihkan</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-xs flex items-center gap-1 font-medium"
            title="Pengaturan AI"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Atur Cipuy</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <PromptSuggestions onSelectPrompt={onSendMessage} />
        ) : (
          <div className="divide-y divide-slate-100 pb-8">
            {messages.map((msg, index) => {
              const isLatestAssistant =
                msg.role === "assistant" && index === messages.length - 1;
              return (
                <ChatMessage
                  key={msg.id || index}
                  message={msg}
                  onRegenerate={onRegenerate}
                  isLatestAssistant={isLatestAssistant}
                />
              );
            })}

            {/* Thinking / Generating Indicator */}
            {isLoading && (
              <div className="py-4 px-3 sm:px-6 bg-white animate-in fade-in duration-300">
                <div className="max-w-3xl mx-auto flex gap-3 sm:gap-4 items-center">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-purple-200 bg-purple-50 flex-shrink-0 animate-bounce">
                    <Image
                      src="/images/cipuy-robot.png"
                      alt="Cipuy Thinking"
                      fill
                      className="object-cover p-0.5"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Cipuy sedang merangkai jawaban cerdas...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

