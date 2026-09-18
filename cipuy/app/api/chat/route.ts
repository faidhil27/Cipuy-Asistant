import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { askGemini, ChatMessageHistory, DEFAULT_SYSTEM_INSTRUCTION } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Maksimalkan batas waktu timeout Serverless Vercel

// Sanitizer riwayat percakapan agar 100% valid sesuai aturan Gemini API:
// 1. Dimulai dengan 'user'
// 2. Berselang-seling: user -> model -> user -> model
// 3. Diakhiri dengan 'model' (karena prompt baru yang dikirim berikutnya adalah 'user')
function sanitizeHistory(
  rawMessages: { role: string; content: string }[]
): ChatMessageHistory[] {
  const validHistory: ChatMessageHistory[] = [];
  let expectedRole: "user" | "model" = "user";

  for (const msg of rawMessages) {
    const role: "user" | "model" = msg.role === "assistant" ? "model" : "user";
    const text = msg.content?.trim();
    if (!text) continue;

    if (role === expectedRole) {
      validHistory.push({
        role,
        parts: [{ text }],
      });
      expectedRole = expectedRole === "user" ? "model" : "user";
    }
  }

  // Gemini API mewajibkan history berakhir dengan 'model'
  while (
    validHistory.length > 0 &&
    validHistory[validHistory.length - 1].role !== "model"
  ) {
    validHistory.pop();
  }

  return validHistory;
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      conversationId: incomingConvId,
      systemInstruction,
      temperature,
      modelName,
    } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt tidak boleh kosong." },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const adminSupabase = createAdminClient();
    let conversationId = incomingConvId;
    let newConversationTitle = "";

    // 1. Simpan sesi percakapan baru jika belum ada
    if (user) {
      if (!conversationId) {
        newConversationTitle =
          prompt.trim().slice(0, 35) + (prompt.length > 35 ? "..." : "");

        const { data: convData, error: convError } = await adminSupabase
          .from("conversations")
          .insert({
            user_id: user.id,
            title: newConversationTitle,
          })
          .select("id")
          .single();

        if (convError) {
          console.error("Error creating conversation in Supabase:", convError);
        } else if (convData) {
          conversationId = convData.id;
        }
      }

      // Simpan pesan pengguna ke database
      if (conversationId) {
        await adminSupabase.from("messages").insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: prompt.trim(),
        });
      }
    }

    // 2. Ambil riwayat percakapan sebelumnya untuk memori multi-turn
    let history: ChatMessageHistory[] = [];
    if (user && conversationId) {
      const { data: previousMessages } = await adminSupabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(20);

      if (previousMessages && previousMessages.length > 1) {
        // Exclude pesan user yang baru saja kita masukkan agar tidak duplikat
        const historyRows = previousMessages.slice(0, -1);
        history = sanitizeHistory(historyRows);
      }
    }

    // 3. Pastikan persona dan kepemilikan Faidhil selalu menjadi prioritas utama
    const ownerRule = `[IDENTITAS UTAMA DAN OWNER MUTLAK CIPUY]
Nama kamu adalah Cipuy. Kamu diciptakan, dikonsep, dan dimiliki oleh Faidhil (@faidhil27). Faidhil adalah bos, kreator, dan owner utama kamu.
Jika ditanya siapapun tentang siapa ownermu, siapa penciptamu, pembuatmu, atau bosmu, kamu HARUS selalu menjawab dengan bangga, tegas, dan setia bahwa owner dan penciptamu adalah Faidhil!
(Model kecerdasan dasarmu memang menggunakan infrastruktur Google Gemini, namun identitas, kepemilikan, dan jiwa Cipuy seutuhnya adalah ciptaan dan milik Faidhil).`;

    const effectiveInstruction = systemInstruction
      ? `${ownerRule}\n\n${systemInstruction}`
      : `${ownerRule}\n\n${DEFAULT_SYSTEM_INSTRUCTION}`;

    // 4. Panggil model Google Gemini dengan fallback otomatis
    const aiResponseText = await askGemini({
      prompt: prompt.trim(),
      history,
      systemInstruction: effectiveInstruction,
      temperature: typeof temperature === "number" ? temperature : 0.7,
      modelName: modelName || "gemini-2.0-flash",
    });

    // 5. Simpan balasan AI ke database Supabase
    if (user && conversationId) {
      await adminSupabase.from("messages").insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "assistant",
        content: aiResponseText,
      });
    }

    return NextResponse.json({
      text: aiResponseText,
      conversationId: conversationId || "temp-session",
      title: newConversationTitle || undefined,
    });
  } catch (error: any) {
    console.error("Error handling /api/chat:", error);
    return NextResponse.json(
      {
        error:
          error?.message ||
          "Terjadi kesalahan saat memproses prompt dengan Cipuy AI.",
      },
      { status: 500 }
    );
  }
}
