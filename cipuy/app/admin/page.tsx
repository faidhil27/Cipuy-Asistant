"use client";

import { useEffect, useState, useMemo } from "react";
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
  Eye,
  Bot,
  User as UserIcon,
  X,
  Copy,
  Check,
  Calendar,
  Sparkles,
  ChevronRight,
  Filter,
  Clock,
  UserCheck,
  UserX,
  ShieldCheck,
} from "lucide-react";

interface AdminStats {
  totalUsers: number;
  pendingUsers: number;
  approvedUsers: number;
  totalConversations: number;
  totalMessages: number;
}

interface UserItem {
  id: string;
  email: string;
  full_name?: string;
  role: "admin" | "user";
  is_approved?: boolean;
  created_at: string;
  conversationsCount: number;
  messagesCount: number;
}

interface MessageLog {
  id: string;
  conversation_id: string;
  user_id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  conversation_title?: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

interface ConversationItem {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface UserDrilldownData {
  user: UserItem;
  conversations: ConversationItem[];
  messages: MessageLog[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"users" | "global">("users");

  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    pendingUsers: 0,
    approvedUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
  });

  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [messages, setMessages] = useState<MessageLog[]>([]);

  // Filtering for Users Tab
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [userStatusFilter, setUserStatusFilter] = useState<"all" | "pending" | "approved">("all");
  const [approvingUserId, setApprovingUserId] = useState<string | null>(null);

  // Filtering for Global Messages Tab
  const [globalSearch, setGlobalSearch] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "user" | "assistant">("all");

  // Database Purge State
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Single Message Detail Modal
  const [selectedMessage, setSelectedMessage] = useState<MessageLog | null>(null);

  // User Prompt Drilldown Modal
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownData, setDrilldownData] = useState<UserDrilldownData | null>(null);
  const [drilldownConvFilter, setDrilldownConvFilter] = useState<string>("all");
  const [drilldownSearch, setDrilldownSearch] = useState("");
  const [drilldownRoleFilter, setDrilldownRoleFilter] = useState<"all" | "user" | "assistant">("all");

  // Copied prompt helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const supabase = createClient();

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Verify admin role
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
        setStats(
          data.stats || {
            totalUsers: 0,
            pendingUsers: 0,
            approvedUsers: 0,
            totalConversations: 0,
            totalMessages: 0,
          }
        );
        setUsersList(data.users || []);
        setMessages(data.messages || []);
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

  // Setujui atau Cabut ACC Akun Pengguna
  const handleApproveUser = async (user: UserItem, approve: boolean) => {
    setApprovingUserId(user.id);
    try {
      const res = await fetch("/api/admin/users/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, approve }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah status persetujuan akun.");
      }

      // Update optimistik pada daftar lokal
      setUsersList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_approved: approve } : u))
      );

      // Update counter statistik
      setStats((prev) => {
        const diff = approve ? 1 : -1;
        return {
          ...prev,
          pendingUsers: Math.max(0, prev.pendingUsers - diff),
          approvedUsers: Math.max(0, prev.approvedUsers + diff),
        };
      });

      setActionResult(
        approve
          ? `Akun ${user.full_name || user.email} berhasil di-ACC / diresmikan!`
          : `Status ACC akun ${user.full_name || user.email} telah dicabut.`
      );
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan.");
    } finally {
      setApprovingUserId(null);
    }
  };

  // Open user prompt inspector
  const openUserPrompts = async (user: UserItem) => {
    setSelectedUser(user);
    setDrilldownLoading(true);
    setDrilldownData(null);
    setDrilldownConvFilter("all");
    setDrilldownSearch("");
    setDrilldownRoleFilter("all");

    try {
      const res = await fetch(`/api/admin/logs?userId=${user.id}`);
      if (res.ok) {
        const data = await res.json();
        setDrilldownData(data);
      } else {
        alert("Gagal memuat riwayat prompt pengguna.");
      }
    } catch (err) {
      console.error("Error loading user prompts:", err);
      alert("Terjadi kesalahan saat memuat prompt pengguna.");
    } finally {
      setDrilldownLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
        fetchAdminData();
      } else {
        alert(data.error || "Gagal melakukan pembersihan database.");
      }
    } catch {
      alert("Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered users list
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      const matchesSearch =
        u.email?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.id.toLowerCase().includes(userSearch.toLowerCase());

      const matchesRole =
        userRoleFilter === "all" ? true : u.role === userRoleFilter;

      const isPending = !u.is_approved && u.role !== "admin";
      const isApproved = u.is_approved || u.role === "admin";

      let matchesStatus = true;
      if (userStatusFilter === "pending") matchesStatus = isPending;
      if (userStatusFilter === "approved") matchesStatus = isApproved;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [usersList, userSearch, userRoleFilter, userStatusFilter]);

  // Filtered global messages
  const filteredGlobalMessages = useMemo(() => {
    return messages.filter((msg) => {
      const matchesSearch =
        msg.content.toLowerCase().includes(globalSearch.toLowerCase()) ||
        msg.profiles?.email?.toLowerCase().includes(globalSearch.toLowerCase()) ||
        msg.profiles?.full_name?.toLowerCase().includes(globalSearch.toLowerCase());

      const matchesRole =
        filterRole === "all" ? true : msg.role === filterRole;

      return matchesSearch && matchesRole;
    });
  }, [messages, globalSearch, filterRole]);

  // Filtered drilldown messages
  const filteredDrilldownMessages = useMemo(() => {
    if (!drilldownData?.messages) return [];
    return drilldownData.messages.filter((msg) => {
      const matchesConv =
        drilldownConvFilter === "all" || msg.conversation_id === drilldownConvFilter;

      const matchesRole =
        drilldownRoleFilter === "all" || msg.role === drilldownRoleFilter;

      const matchesSearch =
        drilldownSearch === "" ||
        msg.content.toLowerCase().includes(drilldownSearch.toLowerCase());

      return matchesConv && matchesRole && matchesSearch;
    });
  }, [drilldownData, drilldownConvFilter, drilldownRoleFilter, drilldownSearch]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="relative w-14 h-14 animate-bounce">
            <Image
              src="/images/cipuy-robot.png"
              alt="Loading"
              fill
              className="object-contain"
            />
          </div>
          <p className="text-xs font-semibold text-slate-500">
            Memuat Data Administrator CIPUY...
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
            Halaman ini khusus untuk Administrator. Akun Anda belum memiliki role <code>admin</code> di database Supabase.
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
    <div className="min-h-screen bg-slate-50/50 relative overflow-x-hidden pb-12">
      {/* Background Mascot Watermark */}
      <BackgroundMascot />

      {/* Main Content Area */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 bg-white/90 backdrop-blur-md rounded-2xl p-5 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 p-1 bg-purple-50 rounded-2xl border border-purple-100 flex-shrink-0">
              <Image
                src="/images/cipuy-robot.png"
                alt="CIPUY"
                fill
                className="object-contain p-1"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  Panel Administrator CIPUY
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold tracking-wide uppercase">
                  Super Admin
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Kelola persetujuan akun (ACC), pantau prompt percakapan pengguna, dan rawat database Supabase
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchAdminData}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Segarkan</span>
            </button>
            <Link
              href="/"
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Buka Chat Cipuy</span>
            </Link>
          </div>
        </div>

        {/* Action result banner */}
        {actionResult && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span className="font-semibold">{actionResult}</span>
            </div>
            <button
              onClick={() => setActionResult(null)}
              className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Cards (4 Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Pengguna */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4 hover:border-purple-200 transition-colors">
            <div className="p-3 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 flex-shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Pengguna</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalUsers}</p>
              <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Semua akun terdaftar</p>
            </div>
          </div>

          {/* Card 2: Menunggu ACC */}
          <div
            onClick={() => {
              setActiveTab("users");
              setUserStatusFilter("pending");
            }}
            className={`p-5 rounded-2xl bg-white border shadow-xs flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] ${
              stats.pendingUsers > 0
                ? "border-amber-300 bg-amber-50/30"
                : "border-slate-200 hover:border-amber-200"
            }`}
          >
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex-shrink-0 relative">
              <Clock className="w-6 h-6" />
              {stats.pendingUsers > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Menunggu ACC</p>
              <p className="text-2xl font-black text-amber-600">{stats.pendingUsers}</p>
              <p className="text-[11px] text-amber-700 font-bold mt-0.5">
                {stats.pendingUsers > 0 ? "⚠️ Butuh persetujuan" : "Semua sudah di-ACC"}
              </p>
            </div>
          </div>

          {/* Card 3: Total Sesi Percakapan */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4 hover:border-indigo-200 transition-colors">
            <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex-shrink-0">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Sesi Percakapan</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalConversations}</p>
              <p className="text-[11px] text-indigo-600 font-semibold mt-0.5">Topik obrolan aktif</p>
            </div>
          </div>

          {/* Card 4: Total Pesan & Prompt */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-4 hover:border-cyan-200 transition-colors">
            <div className="p-3 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex-shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Prompt</p>
              <p className="text-2xl font-black text-slate-900">{stats.totalMessages}</p>
              <p className="text-[11px] text-cyan-600 font-semibold mt-0.5">Prompt & balasan</p>
            </div>
          </div>
        </div>

        {/* Database Purge / Storage Cleaner Engine */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Pembersih Kuota Database Supabase (Purge Engine)
              </h2>
            </div>
            <span className="text-[11px] text-slate-400">
              Menjaga kapasitas database Free Tier Supabase tetap ringan & cepat
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Hapus riwayat obrolan dan pesan lama untuk mengosongkan storage:
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
              <span>Reset / Kosongkan Semua Obrolan</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "users"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Pengguna & Persetujuan (ACC)</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "users"
                  ? "bg-purple-700 text-purple-100"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {usersList.length}
            </span>
            {stats.pendingUsers > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-[10px] font-black animate-pulse">
                {stats.pendingUsers} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("global")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "global"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Log Pesan Global Real-Time</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === "global"
                  ? "bg-purple-700 text-purple-100"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {messages.length}
            </span>
          </button>
        </div>

        {/* TAB 1: DAFTAR PENGGUNA & STATUS ACC */}
        {activeTab === "users" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
            {/* Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <span>Daftar Pengguna & Pengajuan Akun</span>
                  {stats.pendingUsers > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black border border-amber-200">
                      {stats.pendingUsers} Belum di-ACC
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Resmikan (ACC) akun pengguna baru agar dapat masuk dan menggunakan Cipuy
                </p>
              </div>

              {/* Status Tabs and Search */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status Segmented Filter */}
                <div className="flex p-0.5 bg-slate-200/70 rounded-xl text-xs font-semibold">
                  <button
                    onClick={() => setUserStatusFilter("all")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      userStatusFilter === "all"
                        ? "bg-white text-purple-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Semua ({usersList.length})
                  </button>
                  <button
                    onClick={() => setUserStatusFilter("pending")}
                    className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                      userStatusFilter === "pending"
                        ? "bg-amber-500 text-white shadow-2xs font-bold"
                        : "text-amber-800 hover:text-amber-900"
                    }`}
                  >
                    <span>Belum di-ACC</span>
                    {stats.pendingUsers > 0 && (
                      <span
                        className={`px-1 rounded-full text-[9px] font-bold ${
                          userStatusFilter === "pending"
                            ? "bg-amber-600 text-white"
                            : "bg-amber-200 text-amber-900"
                        }`}
                      >
                        {stats.pendingUsers}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setUserStatusFilter("approved")}
                    className={`px-2.5 py-1 rounded-lg transition-all ${
                      userStatusFilter === "approved"
                        ? "bg-white text-emerald-700 shadow-2xs font-bold"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Diresmikan ({stats.approvedUsers})
                  </button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari user / email / nama..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 w-44 sm:w-52 shadow-2xs"
                  />
                </div>

                {/* Role select */}
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="text-xs py-1.5 px-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-slate-700 shadow-2xs"
                >
                  <option value="all">Semua Role</option>
                  <option value="admin">Admin Saja</option>
                  <option value="user">User Biasa</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Pengguna</th>
                    <th className="px-4 py-3">Status ACC</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-center">Sesi Obrolan</th>
                    <th className="px-4 py-3 text-center">Total Prompt</th>
                    <th className="px-4 py-3">Tanggal Daftar</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-xs">
                          {userStatusFilter === "pending"
                            ? "Hebat! Tidak ada akun yang menunggu persetujuan (ACC)."
                            : "Tidak ada pengguna ditemukan"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const initial = (user.full_name || user.email || "U").charAt(0).toUpperCase();
                      const isAdminRole = user.role === "admin";
                      const isApproved = user.is_approved || isAdminRole;
                      const isPending = !isApproved && !isAdminRole;
                      const isApproving = approvingUserId === user.id;

                      return (
                        <tr
                          key={user.id}
                          className={`transition-colors group ${
                            isPending
                              ? "bg-amber-50/40 hover:bg-amber-50"
                              : "hover:bg-purple-50/40"
                          }`}
                        >
                          {/* Pengguna Identity */}
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs flex-shrink-0 ${
                                  isAdminRole
                                    ? "bg-purple-600 text-white"
                                    : isPending
                                    ? "bg-amber-100 text-amber-800 border border-amber-300"
                                    : "bg-indigo-100 text-indigo-700 border border-indigo-200"
                                }`}
                              >
                                {initial}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                                    {user.full_name || user.email.split("@")[0]}
                                  </p>
                                  {isPending && (
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 truncate">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Status ACC Badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {isAdminRole ? (
                              <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 font-extrabold text-[10px] border border-purple-200 inline-flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3 text-purple-600" />
                                Super Admin
                              </span>
                            ) : isApproved ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Diresmikan
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-black text-[10px] border border-amber-300 inline-flex items-center gap-1 shadow-2xs">
                                <Clock className="w-3 h-3 text-amber-600" />
                                Menunggu ACC
                              </span>
                            )}
                          </td>

                          {/* Role Badge */}
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {isAdminRole ? (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">
                                Admin
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium text-[10px]">
                                User
                              </span>
                            )}
                          </td>

                          {/* Conversations Count */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100">
                              {user.conversationsCount} Sesi
                            </span>
                          </td>

                          {/* Total Messages Count */}
                          <td className="px-4 py-3.5 text-center whitespace-nowrap">
                            <span className="px-2.5 py-1 rounded-lg bg-cyan-50 text-cyan-700 font-bold text-xs border border-cyan-100">
                              {user.messagesCount} Pesan
                            </span>
                          </td>

                          {/* Registered Date */}
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                            {formatDate(user.created_at)}
                          </td>

                          {/* Action Buttons */}
                          <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                            {/* Tombol Setujui / Cabut ACC */}
                            {!isAdminRole && (
                              <>
                                {isPending ? (
                                  <button
                                    disabled={isApproving}
                                    onClick={() => handleApproveUser(user, true)}
                                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
                                    title="Setujui dan resmikan akun ini"
                                  >
                                    <UserCheck className="w-3.5 h-3.5" />
                                    <span>{isApproving ? "Menyetujui..." : "ACC / Setujui"}</span>
                                  </button>
                                ) : (
                                  <button
                                    disabled={isApproving}
                                    onClick={() => {
                                      if (
                                        confirm(
                                          `Cabut izin akun ${user.full_name || user.email}? Pengguna tidak akan bisa masuk sampai di-ACC kembali.`
                                        )
                                      ) {
                                        handleApproveUser(user, false);
                                      }
                                    }}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-200 font-medium text-xs inline-flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                                    title="Cabut persetujuan akun"
                                  >
                                    <UserX className="w-3.5 h-3.5" />
                                    <span>Cabut ACC</span>
                                  </button>
                                )}
                              </>
                            )}

                            {/* Tombol Buka Prompt */}
                            <button
                              onClick={() => openUserPrompts(user)}
                              className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-600 text-purple-700 hover:text-white border border-purple-200 hover:border-purple-600 font-bold text-xs inline-flex items-center gap-1.5 transition-all shadow-2xs"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Buka Prompt</span>
                              <ChevronRight className="w-3 h-3" />
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
        )}

        {/* TAB 2: LOG PESAN GLOBAL */}
        {activeTab === "global" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Toolbar */}
            <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Log Seluruh Pesan & Balasan AI
                </h3>
                <p className="text-[11px] text-slate-400">
                  Menampilkan riwayat percakapan terkini dari seluruh pengguna
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari user / kata kunci..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 w-48 sm:w-60 shadow-2xs"
                  />
                </div>

                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 text-slate-700 shadow-2xs"
                >
                  <option value="all">Semua Peran</option>
                  <option value="user">Prompt User</option>
                  <option value="assistant">Balasan Cipuy</option>
                </select>
              </div>
            </div>

            {/* Global Messages Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Pengguna</th>
                    <th className="px-4 py-3">Peran</th>
                    <th className="px-4 py-3">Isi Pesan / Prompt</th>
                    <th className="px-4 py-3">Waktu</th>
                    <th className="px-5 py-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredGlobalMessages.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-semibold text-xs">Tidak ada prompt ditemukan</p>
                      </td>
                    </tr>
                  ) : (
                    filteredGlobalMessages.map((msg) => {
                      const isUser = msg.role === "user";
                      return (
                        <tr key={msg.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-slate-900 truncate max-w-[160px]">
                              {msg.profiles?.email || (msg.user_id ? msg.user_id.slice(0, 8) : "Anonim")}
                            </p>
                            {msg.profiles?.full_name && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                                {msg.profiles.full_name}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            {isUser ? (
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-bold text-[10px] border border-blue-100">
                                User
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-100">
                                Cipuy
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="line-clamp-2 max-w-md text-slate-700 font-mono text-[11px]">
                              {msg.content}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                            {formatDate(msg.created_at)}
                          </td>
                          <td className="px-5 py-3.5 text-right whitespace-nowrap">
                            <button
                              onClick={() => setSelectedMessage(msg)}
                              className="px-2.5 py-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors text-xs font-bold inline-flex items-center gap-1"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Lihat</span>
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
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL / DRAWER: INSPEKSI LENGKAP PROMPT PENGGUNA         */}
      {/* ======================================================== */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm flex-shrink-0 ${
                    selectedUser.role === "admin"
                      ? "bg-purple-600 text-white"
                      : selectedUser.is_approved
                      ? "bg-indigo-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-black text-slate-900 truncate">
                      {selectedUser.full_name || selectedUser.email.split("@")[0]}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        selectedUser.role === "admin"
                          ? "bg-purple-100 text-purple-800 border border-purple-200"
                          : selectedUser.is_approved
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                          : "bg-amber-100 text-amber-900 border border-amber-300"
                      }`}
                    >
                      {selectedUser.role === "admin"
                        ? "Admin"
                        : selectedUser.is_approved
                        ? "Diresmikan"
                        : "Menunggu ACC"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {selectedUser.email} • Terdaftar: {formatDate(selectedUser.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Quick ACC inside modal */}
                {selectedUser.role !== "admin" && (
                  <>
                    {!selectedUser.is_approved ? (
                      <button
                        onClick={() => handleApproveUser(selectedUser, true)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>ACC Akun Ini</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleApproveUser(selectedUser, false)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>Cabut ACC</span>
                      </button>
                    )}
                  </>
                )}

                <button
                  onClick={() => openUserPrompts(selectedUser)}
                  className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs flex items-center gap-1 transition-all"
                  title="Refresh Riwayat User Ini"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${drilldownLoading ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                    setDrilldownData(null);
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter and Stats Bar */}
            <div className="p-4 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-800 font-bold flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{drilldownData?.conversations.length || 0} Sesi Obrolan</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-800 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{drilldownData?.messages.length || 0} Total Pesan</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Conversation */}
                {drilldownData && drilldownData.conversations.length > 0 && (
                  <select
                    value={drilldownConvFilter}
                    onChange={(e) => setDrilldownConvFilter(e.target.value)}
                    className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-purple-500 max-w-[200px] truncate"
                  >
                    <option value="all">Semua Percakapan</option>
                    {drilldownData.conversations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title || "Percakapan Tanpa Judul"}
                      </option>
                    ))}
                  </select>
                )}

                {/* Filter Role */}
                <select
                  value={drilldownRoleFilter}
                  onChange={(e) => setDrilldownRoleFilter(e.target.value as any)}
                  className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:border-purple-500"
                >
                  <option value="all">Semua Peran</option>
                  <option value="user">Hanya Prompt User</option>
                  <option value="assistant">Hanya Balasan Cipuy</option>
                </select>

                {/* Search within user prompt */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari isi prompt..."
                    value={drilldownSearch}
                    onChange={(e) => setDrilldownSearch(e.target.value)}
                    className="pl-7 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-purple-500 w-36 sm:w-44"
                  />
                </div>
              </div>
            </div>

            {/* Modal Body: Prompt & Chat History Stream */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
              {drilldownLoading ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-16">
                  <div className="relative w-12 h-12 animate-spin">
                    <Image
                      src="/images/cipuy-robot.png"
                      alt="Loading"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <p className="text-xs font-semibold text-slate-500">
                    Memuat riwayat prompt dan percakapan pengguna...
                  </p>
                </div>
              ) : filteredDrilldownMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-slate-300">
                    <MessageSquare className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">
                    Belum Ada Riwayat Prompt
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Pengguna ini belum mengirimkan prompt apa pun atau prompt tidak cocok dengan filter pencarian saat ini.
                  </p>
                </div>
              ) : (
                filteredDrilldownMessages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isUser
                          ? "bg-white border-blue-100 shadow-2xs"
                          : "bg-purple-50/40 border-purple-100 shadow-2xs"
                      }`}
                    >
                      {/* Message Metadata Header */}
                      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          {isUser ? (
                            <div className="p-1 rounded-lg bg-blue-100 text-blue-700">
                              <UserIcon className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="p-1 rounded-lg bg-purple-100 text-purple-700">
                              <Bot className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span
                            className={`text-xs font-extrabold ${
                              isUser ? "text-blue-900" : "text-purple-900"
                            }`}
                          >
                            {isUser ? "Prompt Pengguna" : "Balasan Cipuy AI"}
                          </span>
                          {msg.conversation_title && (
                            <span className="hidden sm:inline px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-medium truncate max-w-[220px]">
                              📁 {msg.conversation_title}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">
                            {formatDate(msg.created_at)}
                          </span>
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="p-1 text-slate-400 hover:text-purple-600 rounded transition-colors"
                            title="Salin Isi Prompt"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Content Body */}
                      <div className="text-xs text-slate-800 font-sans whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Menampilkan {filteredDrilldownMessages.length} pesan
              </span>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setDrilldownData(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Single Message Modal (from Global tab) */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
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
