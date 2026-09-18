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
  modelName = process.env.GEMINI_MODEL || "gemini-1.5-pro",
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
      "GEMINI_API_KEY belum dikonfigurasi. Silakan tambahkan GEMINI_API_KEY di file .env.local atau di dashboard Vercel."
    );
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  try {
    const model = genAI.getGenerativeModel({
      model: modelName,
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
    console.error("Error from Gemini API:", error);
    // If the specified model fails (e.g. 404 on custom model name), fallback to gemini-1.5-flash
    if (modelName !== "gemini-1.5-flash" && error?.message?.includes("not found")) {
      console.warn("Fallback to gemini-1.5-flash...");
      const fallbackModel = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemInstruction || DEFAULT_SYSTEM_INSTRUCTION,
      });
      const chat = fallbackModel.startChat({ history });
      const result = await chat.sendMessage(prompt);
      return (await result.response).text();
    }
    throw new Error(error?.message || "Gagal mendapatkan respon dari Google Gemini.");
  }
}

