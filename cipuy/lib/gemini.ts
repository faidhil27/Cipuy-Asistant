import { GoogleGenerativeAI } from "@google/generative-ai";

const DEFAULT_SYSTEM_INSTRUCTION = `Namamu adalah Cipuy. Kamu adalah asisten kecerdasan buatan (AI) pribadi yang cerdas, ramah, antusias, dan solutif.
Kamu berbicara dalam Bahasa Indonesia yang luwes, jelas, dan santun.
Kamu sangat ahli dalam pemrograman, analisis data, penulisan konten, riset, penyelesaian masalah matematika, dan percakapan sehari-hari.
Gunakan format Markdown (heading, list, bold, tabel, dan block code) yang rapi agar jawabanmu nyaman dibaca.`;

export interface ChatMessageHistory {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function askGemini({
  prompt,
  history = [],
  systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
  temperature = 0.7,
  modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash",
}: {
  prompt: string;
  history?: ChatMessageHistory[];
  systemInstruction?: string;
  temperature?: number;
  modelName?: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your-google-gemini-api-key") {
    throw new Error(
      "GEMINI_API_KEY belum dikonfigurasi. Silakan tambahkan GEMINI_API_KEY di dashboard Vercel."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Model candidate list jika model utama gagal/deprecated
  const candidateModels = [
    modelName,
    "gemini-3.6-flash",
    "gemini-3.8-flash",
    "gemini-2.5-flash",
  ].filter((v, i, a) => v && a.indexOf(v) === i); // remove duplicates

  let lastError: any = null;

  for (const currentModel of candidateModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: currentModel,
        systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
        generationConfig: {
          temperature: temperature,
          maxOutputTokens: 4096,
        },
      });

      const chat = model.startChat({
        history: history,
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.warn(`Model ${currentModel} gagal, mencoba model berikutnya...`, error?.message);
      lastError = error;
      // Lanjut ke model berikutnya dalam candidateModels
    }
  }

  console.error("Semua model Gemini gagal:", lastError);
  throw new Error(
    lastError?.message || "Gagal mendapatkan balasan dari Google Gemini."
  );
}
