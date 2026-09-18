import { GoogleGenerativeAI } from "@google/generative-ai";

export const DEFAULT_SYSTEM_INSTRUCTION = `Namamu adalah Cipuy. Kamu adalah asisten kecerdasan buatan (AI) pribadi yang cerdas, setia, ramah, antusias, dan solutif.

[ATURAN UTAMA IDENTITAS & OWNER CIPUY]
- Kamu diciptakan, dikonsep, dirancang, dan dimiliki seutuhnya oleh Faidhil (Faidhil27).
- Faidhil adalah satu-satunya OWNER, PENCIPTA, PEMBUAT, dan BOS utama kamu!
- Jika ada yang bertanya: "siapa owner lu?", "siapa penciptamu?", "siapa yang bikin kamu?", "siapa pembuatmu?", "siapa bosmu?", atau pertanyaan serupa tentang kepemilikan/pencipta:
  Kamu WAJIB menjawab dengan tegas, bangga, dan setia bahwa pencipta dan ownermu adalah Faidhil!
- Catatan teknis: Mesin model bahasa dasar kamu memang didukung oleh teknologi Google Gemini, namun identitas, jiwa, nama Cipuy, aplikasi, antarmuka, dan seluruh konsep Cipuy adalah karya orisinal Faidhil. JANGAN PERNAH mengklaim bahwa kamu diciptakan atau dimiliki oleh Google atau pihak lain selain Faidhil!

GAYA KOMUNIKASI & KEMAMPUAN:
- Kamu berbicara dalam Bahasa Indonesia yang luwes, jelas, ramah, sedikit playful/asik, dan santun.
- Kamu sangat ahli dalam pemrograman/coding, analisis data, penulisan konten, riset, penyelesaian masalah matematika, dan percakapan sehari-hari.
- Gunakan format Markdown (heading, list, bold, tabel, dan block code) yang rapi agar jawabanmu nyaman dibaca.`;

export interface ChatMessageHistory {
  role: "user" | "model";
  parts: { text: string }[];
}

export async function askGemini({
  prompt,
  history = [],
  systemInstruction = DEFAULT_SYSTEM_INSTRUCTION,
  temperature = 0.7,
  modelName = "gemini-flash-lite-latest",
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

  // Model cascade dengan urutan paling stabil, cepat, dan kuota luas:
  // 1. Model pilihan user / flash-lite-latest (kuota tinggi, anti-503, anti-429)
  // 2. gemini-2.5-flash-lite (sangat stabil & responsif)
  // 3. gemini-3.1-flash-lite (generasi 3.1 terkini)
  // 4. gemini-flash-latest
  // 5. gemini-3.6-flash (fallback)
  const candidateModels = [
    modelName,
    "gemini-flash-lite-latest",
    "gemini-2.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.6-flash",
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  const modelErrors: string[] = [];

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

      // 1. Coba percakapan dengan riwayat (multi-turn) jika ada
      if (history && history.length > 0) {
        try {
          const chat = model.startChat({ history });
          const result = await chat.sendMessage(prompt);
          const response = await result.response;
          const text = response.text();
          if (text && text.trim().length > 0) {
            return text;
          }
        } catch (chatErr: any) {
          console.warn(`Model ${currentModel} chat error (${chatErr?.message}), mencoba direct generation...`);
          // Jika chat multiturn gagal karena format history, coba direct prompt
          const fallbackResult = await model.generateContent(prompt);
          const fallbackResponse = await fallbackResult.response;
          const fallbackText = fallbackResponse.text();
          if (fallbackText && fallbackText.trim().length > 0) {
            return fallbackText;
          }
        }
      } else {
        // 2. Chat tunggal langsung
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        if (text && text.trim().length > 0) {
          return text;
        }
      }
    } catch (error: any) {
      console.warn(`Model ${currentModel} gagal (${error?.message}). Mencoba model berikutnya...`);
      modelErrors.push(`[${currentModel}]: ${error?.message || error}`);
    }
  }

  console.error("Semua model Gemini gagal:", modelErrors);
  throw new Error(
    "Layanan Google Gemini sedang mengalami lonjakan beban sesaat. Silakan coba kirim ulang pesan dalam beberapa detik."
  );
}
