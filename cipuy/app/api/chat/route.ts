import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { askGemini, ChatMessageHistory } from "@/lib/gemini";

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

    let conversationId = incomingConvId;
    let newConversationTitle = "";

    // If user is authenticated and Supabase is configured:
    if (user) {
      // If no conversationId provided, create a new conversation session
      if (!conversationId) {
        // Create title from first 30 characters of prompt
        newConversationTitle =
          prompt.trim().slice(0, 35) + (prompt.length > 35 ? "..." : "");
        const { data: convData, error: convError } = await supabase
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

      // If we have a conversationId, save user message
      if (conversationId) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: prompt.trim(),
        });
      }
    }

    // Retrieve previous messages for conversation context (multi-turn memory)
    let history: ChatMessageHistory[] = [];
    if (user && conversationId) {
      const { data: previousMessages } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(20);

      if (previousMessages && previousMessages.length > 1) {
        // Exclude the message we just inserted so it's only passed as the current prompt
        const historyRows = previousMessages.slice(0, -1);
        history = historyRows.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        }));
      }
    }

    // Pastikan persona dan aturan owner Faidhil selalu menjadi prioritas utama
    const ownerRule = `[IDENTITAS UTAMA DAN OWNER MUTLAK CIPUY]
Nama kamu adalah Cipuy. Kamu diciptakan, dikonsep, dan dimiliki oleh Faidhil (@faidhil27). Faidhil adalah bos, kreator, dan owner utama kamu.
Jika ditanya siapapun tentang siapa ownermu, siapa penciptamu, pembuatmu, atau bosmu, kamu HARUS selalu menjawab dengan bangga, tegas, dan setia bahwa owner dan penciptamu adalah Faidhil!
(Model kecerdasan dasarmu memang menggunakan infrastruktur Google Gemini, namun identitas, kepemilikan, dan jiwa Cipuy seutuhnya adalah ciptaan dan milik Faidhil).`;

    const effectiveInstruction = systemInstruction
      ? `${ownerRule}\n\n${systemInstruction}`
      : ownerRule;

    // Call Google Gemini API
    const aiResponseText = await askGemini({
      prompt: prompt.trim(),
      history,
      systemInstruction: effectiveInstruction,
      temperature,
      modelName,
    });

    // Save AI response to Supabase
    if (user && conversationId) {
      await supabase.from("messages").insert({
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

