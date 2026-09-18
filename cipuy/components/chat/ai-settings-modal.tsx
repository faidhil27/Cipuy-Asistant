"use client";

import { useState } from "react";
import { X, Sliders, Download, Trash2, Check, RefreshCw } from "lucide-react";

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  systemPrompt: string;
  onSaveSystemPrompt: (prompt: string) => void;
  temperature: number;
  onSaveTemperature: (temp: number) => void;
  model: string;
  onSaveModel: (model: string) => void;
  onExportChat: (format: "markdown" | "json" | "txt") => void;
  onClearChat: () => void;
}

export function AISettingsModal({
  isOpen,
  onClose,
  systemPrompt,
  onSaveSystemPrompt,
  temperature,
  onSaveTemperature,
  model,
  onSaveModel,
  onExportChat,
  onClearChat,
}: AISettingsModalProps) {
  const [localPrompt, setLocalPrompt] = useState(systemPrompt);
  const [localTemp, setLocalTemp] = useState(temperature);
  const [localModel, setLocalModel] = useState(model);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveSystemPrompt(localPrompt);
    onSaveTemperature(localTemp);
    onSaveModel(localModel);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  const handleResetPrompt = () => {
    const defaultPrompt = `Namamu adalah Cipuy. Kamu adalah asisten kecerdasan buatan (AI) pribadi yang cerdas, ramah, antusias, dan solutif.
Kamu berbicara dalam Bahasa Indonesia yang luwes, jelas, dan santun.
Kamu sangat ahli dalam pemrograman, analisis data, penulisan konten, riset, penyelesaian masalah matematika, dan percakapan sehari-hari.`;
    setLocalPrompt(defaultPrompt);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800">
                Pengaturan Cipuy AI
              </h3>
              <p className="text-xs text-slate-400">
                Kustomisasi kepribadian, model, dan unduh riwayat
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Model Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">
            Model Google Gemini
          </label>
          <select
            value={localModel}
            onChange={(e) => setLocalModel(e.target.value)}
            className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white"
          >
            <option value="gemini-3.6-flash">Gemini 3.6 Flash (Resmi & Tercepat)</option>
            <option value="gemini-3.8-flash">Gemini 3.8 Flash (Generasi Terkini)</option>
            <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
          </select>
        </div>

        {/* Temperature / Creativity Slider */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Tingkat Kreativitas (Temperature): {localTemp}
            </span>
            <span className="text-slate-400 text-[11px]">
              {localTemp < 0.4 ? "Faktual & Kaku" : localTemp > 0.8 ? "Sangat Kreatif" : "Seimbang"}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={localTemp}
            onChange={(e) => setLocalTemp(parseFloat(e.target.value))}
            className="w-full accent-purple-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
          />
        </div>

        {/* System Prompt Instructions */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700">
              Instruksi Karakter Cipuy (System Prompt)
            </label>
            <button
              type="button"
              onClick={handleResetPrompt}
              className="text-[11px] text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium"
            >
              <RefreshCw className="w-3 h-3" /> Reset Default
            </button>
          </div>
          <textarea
            rows={4}
            value={localPrompt}
            onChange={(e) => setLocalPrompt(e.target.value)}
            className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white resize-none leading-relaxed"
            placeholder="Ketik instruksi khusus untuk Cipuy di sini..."
          />
        </div>

        {/* Export & Clear Actions */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-600">Export:</span>
            <button
              onClick={() => onExportChat("markdown")}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 font-medium transition-colors"
              title="Download Markdown"
            >
              <Download className="w-3 h-3" /> .MD
            </button>
            <button
              onClick={() => onExportChat("txt")}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 font-medium transition-colors"
              title="Download Text"
            >
              <Download className="w-3 h-3" /> .TXT
            </button>
            <button
              onClick={() => onExportChat("json")}
              className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 font-medium transition-colors"
              title="Download JSON"
            >
              <Download className="w-3 h-3" /> .JSON
            </button>
          </div>

          <button
            onClick={() => {
              if (confirm("Apakah Anda yakin ingin mengosongkan percakapan ini?")) {
                onClearChat();
                onClose();
              }
            }}
            className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center gap-1 font-medium transition-colors"
            title="Bersihkan pesan chat aktif"
          >
            <Trash2 className="w-3 h-3" /> Kosongkan Sesi
          </button>
        </div>

        {/* Save button */}
        <div className="pt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4" /> Tersimpan!
              </>
            ) : (
              "Simpan Perubahan"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

