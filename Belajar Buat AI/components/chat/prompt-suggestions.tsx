"use client";

import Image from "next/image";
import { Code, PenTool, Lightbulb, Sparkles, BarChart3 } from "lucide-react";

interface PromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
}

export function PromptSuggestions({ onSelectPrompt }: PromptSuggestionsProps) {
  const suggestions = [
    {
      icon: Code,
      title: "Pemrograman & Koding",
      prompt: "Bantu buatkan skrip Python untuk analisis data dan visualisasi grafik.",
      color: "text-purple-600 bg-purple-50 border-purple-100",
    },
    {
      icon: PenTool,
      title: "Penulisan & Konten",
      prompt: "Tuliskan draf artikel blog menarik mengenai peran kecerdasan buatan dalam produktivitas kerja.",
      color: "text-indigo-600 bg-indigo-50 border-indigo-100",
    },
    {
      icon: BarChart3,
      title: "Riset & Strategi",
      prompt: "Rancang strategi rencana bisnis sederhana dan langkah riset pasar untuk produk baru.",
      color: "text-cyan-600 bg-cyan-50 border-cyan-100",
    },
    {
      icon: Lightbulb,
      title: "Penjelasan Konsep",
      prompt: "Jelaskan cara kerja Machine Learning dengan analogi sederhana sehari-hari.",
      color: "text-amber-600 bg-amber-50 border-amber-100",
    },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8 flex flex-col items-center justify-center text-center animate-in fade-in duration-500">
      {/* Friendly Cipuy Avatar & Welcome */}
      <div className="relative w-24 h-24 mb-4 drop-shadow-md transition-transform hover:scale-105 duration-300">
        <Image
          src="/images/cipuy-robot.png"
          alt="Cipuy Robot Mascot"
          fill
          className="object-contain"
          priority
        />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-semibold mb-2">
        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
        <span>Cipuy AI — Asisten Pribadi Cerdas</span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
        Halo! Ada yang bisa aku bantu?
      </h1>
      <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
        Tanyakan apa saja, minta bantuan koding, rancang ide konten, atau diskusi bebas. Jawabanmu diproses aman dan tersimpan di database.
      </p>

      {/* Suggestion Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left">
        {suggestions.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-3.5 rounded-2xl bg-white border border-slate-200/90 hover:border-purple-300 hover:shadow-md transition-all group active:scale-[0.99] flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg border ${item.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                  {item.title}
                </span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                &ldquo;{item.prompt}&rdquo;
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

