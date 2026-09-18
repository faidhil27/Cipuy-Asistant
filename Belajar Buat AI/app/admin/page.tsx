"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BackgroundMascot } from "@/components/layout/background-mascot";
import { formatDate } from "@/lib/utils";
import {
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Trash2,
  Search,
  Users,
  MessageSquare,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalConversations: number;
  totalMessages: number;
}

interface MessageLog {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
  });
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "user" | "assistant">("all");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageLog | null>(null);

  const supabase = createClient();

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Check current session
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Verify role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!profile || profile.role !== "admin") {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      // Call admin logs API
      const res = await fetch("/api/admin/logs");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Error loading admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handlePurge = async (daysOld?: number, purgeAll?: boolean) => {
    const confirmText = purgeAll
      ? "PERINGATAN: Anda akan menghapus SEMUA riwayat obrolan di database. Lanjutkan?"
      : `Apakah Anda yakin ingin menghapus obrolan yang lebih lama dari ${daysOld} hari?`;

    if (!confirm(confirmText)) return;

    setActionLoading(true);
    setActionResult(null);

    try {
      const res = await fetch("/api/admin/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ daysOld, purgeAll }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionResult(data.message);
        fetchAdminData(); // Refresh table
      } else {
        alert(data.error || "Gagal melakukan pembersihan database.");
      }
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      filterRole === "all" ? true : msg.role === filterRole;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-12 h-12 animate-bounce">
            <Image
              src="/images/cipuy-robot.png"
              alt="Loading"
              fill
              className="object-contain"
            />
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Memuat Data Administrator...
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-white">
        <div className="max-w-md w-full p-6 text-center rounded-3xl border border-rose-200 bg-rose-50 space-y-4">
          <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Akses Terbatas</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Halaman ini khusus untuk Administrator. Akun Anda belum memiliki role <code>admin</code> di tabel <code>profiles</code>.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Chat Cipuy</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white relative overflow-x-hidden">
      {/* Background Mascot Watermark */}
      <BackgroundMascot />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10">
              <Image
                src="/images/cipuy-robot.png"
                alt="CIPUY"
                fill
                className="object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-extrabold text-slate-900">
                  Panel Administrator CIPUY
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Pantau prompt seluruh pengguna dan bersihkan database Supabase agar hemat kuota
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchAdminData}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1.5 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Buka Chat</span>
            </Link>
          </div>
        </div>

        {/* Action result banner */}
        {actionResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{actionResult}</span>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Pengguna Terdaftar</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalUsers}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Sesi Obrolan</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalConversations}</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Pesan & Prompt</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalMessages}</p>
            </div>
          </div>
        </div>

        {/* Database Purge / Cleaner Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Pembersih Kuota Database (Purge Engine)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Menjaga storage Supabase Free Tier tetap aman
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Hapus riwayat obrolan dan pesan lama untuk mengosongkan kapasitas database Supabase Anda:
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              disabled={actionLoading}
              onClick={() => handlePurge(7)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              Hapus Obrolan &gt; 7 Hari
            </button>
            <button
              disabled={actionLoading}
              onClick={() => handlePurge(14)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              Hapus Obrolan &gt; 14 Hari
            </button>
            <button
              disabled={actionLoading}
              onClick={() => handlePurge(30)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all active:scale-95 disabled:opacity-50"
            >
              Hapus Obrolan &gt; 30 Hari
            </button>
            <button
              disabled={actionLoading}
              onClick={() => handlePurge(undefined, true)}
              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Kosongkan Semua Log (Reset)</span>
            </button>
          </div>
        </div>

        {/* User Prompts & Messages Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Log Prompt Seluruh Pengguna
              </h3>
              <p className="text-[11px] text-slate-400">
                Menampilkan 100 prompt dan balasan terbaru secara real-time
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari user / kata kunci..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 w-44 sm:w-56"
                />
              </div>

              {/* Role filter */}
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value as any)}
                className="text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-slate-700"
              >
                <option value="all">Semua Peran</option>
                <option value="user">Prompt User</option>
                <option value="assistant">Balasan AI</option>
              </select>
            </div>
          </div>

          {/* Table list */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-4 py-3">Pengguna</th>
                  <th className="px-4 py-3">Peran</th>
                  <th className="px-4 py-3">Isi Pesan / Prompt</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMessages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada prompt ditemukan
                    </td>
                  </tr>
                ) : (
                  filteredMessages.map((msg) => {
                    const isUser = msg.role === "user";
                    return (
                      <tr key={msg.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-900 truncate max-w-[140px]">
                            {msg.profiles?.email || msg.user_id.slice(0, 8)}
                          </p>
                          {msg.profiles?.full_name && (
                            <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                              {msg.profiles.full_name}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isUser ? (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-100">
                              User
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium text-[11px] border border-purple-100">
                              Cipuy
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="line-clamp-2 max-w-md text-slate-700 font-mono text-[11px]">
                            {msg.content}
                          </p>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-slate-400 text-[11px]">
                          {formatDate(msg.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedMessage(msg)}
                            className="p-1 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Lihat Detail</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detail Message Modal */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  Detail Pesan: {selectedMessage.role === "user" ? "Prompt Pengguna" : "Respon Cipuy"}
                </h3>
                <p className="text-[11px] text-slate-400">
                  User: {selectedMessage.profiles?.email || selectedMessage.user_id} • {formatDate(selectedMessage.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 whitespace-pre-wrap font-sans leading-relaxed">
              {selectedMessage.content}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

