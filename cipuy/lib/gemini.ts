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
  modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash",
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

  // Model prioritas: model terpilih -> 2.0-flash -> 1.5-flash -> 2.5-flash
  const candidateModels = [
    modelName,
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
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

      // Coba generate via chat history jika ada
      if (history && history.length > 0) {
        try {
          const chat = model.startChat({ history });
          const result = await chat.sendMessage(prompt);
          const response = await result.response;
          return response.text();
        } catch (chatError: any) {
          console.warn(
            `Chat multiturn dengan model ${currentModel} gagal (${chatError?.message}), mencoba direct generation tanpa corrupt history...`
          );
          const fallbackResult = await model.generateContent(prompt);
          const fallbackResponse = await fallbackResult.response;
          return fallbackResponse.text();
        }
      } else {
        // Chat tunggal (tanpa history)
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
      }
    } catch (error: any) {
      console.warn(`Model ${currentModel} gagal:`, error?.message);
      modelErrors.push(`[${currentModel}]: ${error?.message || error}`);
    }
  }

  console.error("Semua model Gemini gagal:", modelErrors);
  throw new Error(
    `Semua model Gemini gagal: ${modelErrors.join(" || ")}`
  );
}
