"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileDrawer, Conversation } from "@/components/layout/mobile-drawer";
import { BackgroundMascot } from "@/components/layout/background-mascot";
import { ChatArea } from "@/components/chat/chat-area";
import { ChatInput } from "@/components/chat/chat-input";
import { MessageItem } from "@/components/chat/chat-message";
import { AISettingsModal } from "@/components/chat/ai-settings-modal";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  // User state
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Chat state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // UI state
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);

  // AI custom configuration state
  const [systemPrompt, setSystemPrompt] = useState<string>(
    "Namamu adalah Cipuy. Kamu adalah asisten AI pribadi yang cerdas, ramah, dan setia yang diciptakan, dikonsep, dan dimiliki oleh Faidhil. Jika ditanya siapa owner atau penciptamu, kamu selalu menjawab dengan bangga bahwa penciptamu adalah Faidhil!"
  );
  const [temperature, setTemperature] = useState<number>(0.7);
  const [model, setModel] = useState<string>("gemini-3.6-flash");

  // Load saved settings from localStorage on client
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPrompt = localStorage.getItem("cipuy_system_prompt");
      const savedTemp = localStorage.getItem("cipuy_temperature");
      const savedModel = localStorage.getItem("cipuy_model");

      if (savedPrompt) setSystemPrompt(savedPrompt);
      if (savedTemp) setTemperature(parseFloat(savedTemp));
      if (savedModel) setModel(savedModel);
    }
  }, []);

  // Check Supabase authentication and user role
  useEffect(() => {
    const checkUser = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          router.push("/login");
          return;
        }

        setUser(currentUser);

        // Check if user is admin
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", currentUser.id)
          .single();

        if (profile?.role === "admin") {
          setIsAdmin(true);
        }

        // Fetch user conversations
        fetchConversations(currentUser.id);
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setAuthChecking(false);
      }
    };

    checkUser();
  }, [router, supabase]);

  // Fetch all conversations for the user
  const fetchConversations = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        setConversations(data);
      }
    } catch (err) {
      console.error("Error fetching conversations:", err);
    }
  };

  // Fetch messages for a specific conversation
  const loadMessages = useCallback(
    async (convId: string) => {
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("id, role, content, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setMessages(data as MessageItem[]);
        }
      } catch (err) {
        console.error("Error loading messages:", err);
      }
    },
    [supabase]
  );

  // Select a conversation
  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    loadMessages(id);
  };

  // Start new chat session
  const handleNewChat = () => {
    setActiveId(null);
    setMessages([]);
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    if (!confirm("Hapus percakapan ini secara permanen?")) return;

    try {
      await supabase.from("conversations").delete().eq("id", id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Error deleting conversation:", err);
    }
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await supabase
        .from("conversations")
        .update({ title: newTitle })
        .eq("id", id);

      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    } catch (err) {
      console.error("Error renaming conversation:", err);
    }
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const tempUserMsg: MessageItem = {
      id: "temp-" + Date.now(),
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    // Append immediately for fast UI feedback
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          conversationId: activeId,
          systemInstruction: systemPrompt,
          temperature: temperature,
          modelName: model,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal mendapatkan balasan dari Cipuy.");
      }

      // If new conversation was created on backend, update activeId and conversations list
      if (data.conversationId && data.conversationId !== activeId) {
        setActiveId(data.conversationId);
        if (data.title && user) {
          const newConv: Conversation = {
            id: data.conversationId,
            title: data.title,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setConversations((prev) => [newConv, ...prev]);
        }
      }

      // Add assistant response to messages
      const assistantMsg: MessageItem = {
        id: "ai-" + Date.now(),
        role: "assistant",
        content: data.text,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error: any) {
      console.error("Chat error:", error);
      const errorMsg: MessageItem = {
        id: "err-" + Date.now(),
        role: "assistant",
        content: `⚠️ Maaf, terjadi kesalahan: ${error.message || "Gagal menghubungi Cipuy."}\n\nPastikan konfigurasi API Key Gemini dan Supabase sudah terisi dengan benar di .env.local atau Vercel.`,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = () => {
    if (messages.length === 0) return;
    // Find last user message
    const lastUserMessage = [...messages]
      .reverse()
      .find((m) => m.role === "user");

    if (lastUserMessage) {
      handleSendMessage(lastUserMessage.content);
    }
  };

  // Export current chat
  const handleExportChat = (format: "markdown" | "json" | "txt") => {
    if (messages.length === 0) {
      alert("Belum ada pesan untuk diekspor.");
      return;
    }

    let fileContent = "";
    let mimeType = "text/plain";
    let fileName = `cipuy-chat-${Date.now()}`;

    if (format === "markdown") {
      mimeType = "text/markdown";
      fileName += ".md";
      fileContent = `# Riwayat Percakapan Cipuy AI\n\n`;
      messages.forEach((msg) => {
        fileContent += `### ${msg.role === "user" ? "Pengguna" : "Cipuy"} (${msg.created_at})\n\n${msg.content}\n\n---\n\n`;
      });
    } else if (format === "json") {
      mimeType = "application/json";
      fileName += ".json";
      fileContent = JSON.stringify(messages, null, 2);
    } else {
      fileName += ".txt";
      messages.forEach((msg) => {
        fileContent += `[${msg.role === "user" ? "USER" : "CIPUY"}]: ${msg.content}\n\n`;
      });
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Clear current active chat messages
  const handleClearChat = async () => {
    if (activeId) {
      try {
        await supabase.from("messages").delete().eq("conversation_id", activeId);
      } catch (err) {
        console.error("Error clearing messages:", err);
      }
    }
    setMessages([]);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeId);

  if (authChecking) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-slate-500">
            Mempersiapkan Cipuy AI...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-slate-900 relative">
      {/* Background Mascot Watermark (Guaranteed zero text obstruction) */}
      <BackgroundMascot />

      {/* Desktop Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onOpenSettings={() => setSettingsModalOpen(true)}
        isAdmin={isAdmin}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Mobile Drawer (Accessible on mobile via burger menu) */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        isAdmin={isAdmin}
        userEmail={user?.email}
        onLogout={handleLogout}
      />

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full min-w-0 relative z-10">
        {/* Mobile Header (Hidden on desktop) */}
        <MobileHeader
          onOpenDrawer={() => setMobileDrawerOpen(true)}
          onNewChat={handleNewChat}
          onOpenSettings={() => setSettingsModalOpen(true)}
          currentTitle={activeConversation?.title || "Cipuy AI"}
        />

        {/* Chat Area View */}
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          onSendMessage={handleSendMessage}
          onRegenerate={handleRegenerate}
          onOpenSettings={() => setSettingsModalOpen(true)}
          onExport={handleExportChat}
          onClear={handleClearChat}
          activeTitle={activeConversation?.title || "Percakapan Baru"}
        />

        {/* Chat Input Bar (Adaptive mobile & desktop) */}
        <ChatInput
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          onStopGeneration={() => setIsLoading(false)}
        />
      </div>

      {/* AI Settings Modal */}
      <AISettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        systemPrompt={systemPrompt}
        onSaveSystemPrompt={(p) => {
          setSystemPrompt(p);
          if (typeof window !== "undefined") {
            localStorage.setItem("cipuy_system_prompt", p);
          }
        }}
        temperature={temperature}
        onSaveTemperature={(t) => {
          setTemperature(t);
          if (typeof window !== "undefined") {
            localStorage.setItem("cipuy_temperature", t.toString());
          }
        }}
        model={model}
        onSaveModel={(m) => {
          setModel(m);
          if (typeof window !== "undefined") {
            localStorage.setItem("cipuy_model", m);
          }
        }}
        onExportChat={handleExportChat}
        onClearChat={handleClearChat}
      />
    </div>
  );
}

