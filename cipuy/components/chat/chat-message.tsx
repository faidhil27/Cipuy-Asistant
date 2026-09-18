"use client";

import Image from "next/image";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  User,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface MessageItem {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

interface ChatMessageProps {
  message: MessageItem;
  onRegenerate?: () => void;
  isLatestAssistant?: boolean;
}

export function ChatMessage({
  message,
  onRegenerate,
  isLatestAssistant,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Copy message text
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Text-To-Speech (TTS) using Web Speech API
  const handleToggleSpeech = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Browser Anda belum mendukung fitur Text-to-Speech.");
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.lang = "id-ID";
    utterance.rate = 1.0;

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  return (
    <div
      className={`py-4 px-3 sm:px-6 transition-colors ${
        isUser ? "bg-slate-50/50" : "bg-white"
      }`}
    >
      <div className="max-w-3xl mx-auto flex gap-3 sm:gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              <User className="w-4 h-4" />
            </div>
          ) : (
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-purple-200 bg-purple-50 shadow-sm">
              <Image
                src="/images/cipuy-robot.png"
                alt="Cipuy Robot"
                fill
                className="object-cover p-0.5"
              />
            </div>
          )}
        </div>

        {/* Message Content & Action Bar */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Sender label and time */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">
              {isUser ? "Anda" : "Cipuy"}
            </span>
            {!isUser && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-semibold">
                <Sparkles className="w-2.5 h-2.5" /> AI
              </span>
            )}
            <span className="text-[10px] text-slate-400">
              {formatDate(message.created_at)}
            </span>
          </div>

          {/* Body */}
          <div className="text-slate-800 text-sm leading-relaxed break-words markdown-container">
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    const codeString = String(children).replace(/\n$/, "");

                    if (!inline) {
                      return (
                        <div className="relative my-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 text-slate-100 text-xs">
                          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 border-b border-slate-700 text-[11px] text-slate-300">
                            <span>{match ? match[1] : "code"}</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(codeString);
                              }}
                              className="hover:text-white flex items-center gap-1 transition-colors"
                            >
                              <Copy className="w-3 h-3" /> Salin
                            </button>
                          </div>
                          <pre className="p-3 overflow-x-auto">
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        </div>
                      );
                    }
                    return (
                      <code
                        className="px-1.5 py-0.5 bg-purple-50 text-purple-800 rounded font-mono text-xs border border-purple-100"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return <p className="mb-2 last:mb-0">{children}</p>;
                  },
                  ul({ children }) {
                    return <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>;
                  },
                  ol({ children }) {
                    return <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>;
                  },
                  table({ children }) {
                    return (
                      <div className="overflow-x-auto my-3">
                        <table className="min-w-full border border-slate-200 divide-y divide-slate-200 text-xs text-left">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }) {
                    return <th className="bg-slate-100 px-3 py-1.5 font-semibold text-slate-700">{children}</th>;
                  },
                  td({ children }) {
                    return <td className="border-t border-slate-200 px-3 py-1.5">{children}</td>;
                  },
                  blockquote({ children }) {
                    return (
                      <blockquote className="border-l-4 border-purple-400 pl-3 italic text-slate-600 my-2">
                        {children}
                      </blockquote>
                    );
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 pt-1 text-slate-400">
            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="p-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center gap-1 text-[11px]"
              title="Salin Teks"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-medium">Disalin</span>
                </>
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Read aloud button (TTS) */}
            <button
              onClick={handleToggleSpeech}
              className={`p-1 rounded hover:bg-slate-100 transition-colors ${
                isSpeaking ? "text-purple-600 bg-purple-50" : "hover:text-slate-700"
              }`}
              title={isSpeaking ? "Hentikan Suara" : "Dengarkan Jawaban"}
            >
              {isSpeaking ? (
                <VolumeX className="w-3.5 h-3.5 text-purple-600" />
              ) : (
                <Volume2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Regenerate button (if latest assistant message) */}
            {!isUser && isLatestAssistant && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded hover:bg-slate-100 hover:text-slate-700 transition-colors flex items-center gap-1 text-[11px]"
                title="Buat Ulang Jawaban"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ulangi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

