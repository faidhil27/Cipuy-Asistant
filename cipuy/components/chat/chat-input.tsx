"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Square, Sparkles, AlertCircle } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (content: string) => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
  onOpenTemplates?: () => void;
  modelName?: string;
}

export function ChatInput({
  onSendMessage,
  isLoading,
  onStopGeneration,
  onOpenTemplates,
  modelName = "Gemini 2.0 Flash",
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  // Setup Web Speech API for voice typing
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "id-ID";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }
  }, []);

  // Toggle voice recognition
  const toggleListening = () => {
    if (!speechSupported) {
      alert("Browser Anda belum mendukung input suara (Web Speech API).");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        setIsListening(false);
      }
    }
  };

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        180
      )}px`;
    }
  }, [input]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="sticky bottom-0 z-20 w-full bg-gradient-to-t from-white via-white/95 to-transparent pt-3 pb-3 px-3 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <form
          onSubmit={handleSubmit}
          className="relative flex items-end gap-1.5 p-1.5 sm:p-2 rounded-2xl bg-white border border-slate-300 shadow-md focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-100 transition-all"
        >
          {/* Voice Input (Microphone) Button */}
          <button
            type="button"
            onClick={toggleListening}
            className={`p-2.5 rounded-xl transition-all ${
              isListening
                ? "bg-rose-500 text-white animate-pulse"
                : "text-slate-400 hover:text-purple-600 hover:bg-purple-50"
            }`}
            title={isListening ? "Mendengarkan... (Klik untuk stop)" : "Ketik Lewat Suara (Mikrofon)"}
            aria-label="Input Suara"
          >
            {isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tanyakan apa saja kepada Cipuy..."
            className="flex-1 max-h-44 resize-none border-0 bg-transparent py-2 px-1 text-sm text-slate-800 focus:outline-none placeholder:text-slate-400 leading-relaxed"
          />

          {/* Send or Stop Button */}
          {isLoading ? (
            <button
              type="button"
              onClick={onStopGeneration}
              className="p-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center justify-center shadow-sm"
              title="Hentikan pembuatan"
            >
              <Square className="w-4 h-4 fill-white" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                input.trim()
                  ? "bg-purple-600 text-white hover:bg-purple-700 shadow-sm shadow-purple-200 active:scale-95"
                  : "bg-slate-100 text-slate-300 cursor-not-allowed"
              }`}
              title="Kirim Pesan"
              aria-label="Kirim Pesan"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>

        {/* Footer info tip */}
        <div className="flex items-center justify-between mt-1 px-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
            <span>Model: {modelName.replace("gemini-", "Gemini ").replace("-flash", " Flash").replace("-pro", " Pro")} (Aktif & Cepat)</span>
          </div>
          <span>Tekan Shift + Enter untuk baris baru</span>
        </div>
      </div>
    </div>
  );
}

