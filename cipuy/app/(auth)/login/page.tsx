"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BackgroundMascot } from "@/components/layout/background-mascot";
import { LogIn, UserPlus, AlertCircle, ArrowRight, Shield, Clock, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();

  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successNotice, setSuccessNotice] = useState("");

  const supabase = createClient();

  // Cek apakah ada redirect karena akun belum di-ACC
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("error") === "unapproved") {
        setErrorMessage("Akun ini belum diresmikan, hubungi admin");
      }
    }
  }, []);

  // Helper untuk mengubah username menjadi format login yang valid
  const getAuthEmail = (userInput: string) => {
    const clean = userInput.trim().toLowerCase();
    return clean.includes("@") ? clean : `${clean.replace(/[^a-z0-9_]/g, "")}@cipuy.local`;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessNotice("");
    setLoading(true);

    try {
      const email = getAuthEmail(username);

      if (isSignUp) {
        // Pendaftaran: mengajukan pembuatan akun ke admin
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username,
            password,
            fullName,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Gagal mengajukan pendaftaran akun.");
        }

        // Jika akun butuh ACC dari admin
        if (data.pendingApproval) {
          setIsSignUp(false);
          setPassword("");
          setSuccessNotice(
            "Pengajuan akun berhasil dikirim! Akun Anda sedang menunggu persetujuan (ACC) dari Admin. Silakan hubungi admin untuk aktivasi sebelum masuk."
          );
          setLoading(false);
          return;
        }

        // Jika akun pertama / Admin otomatis aktif
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;

        router.push("/");
        router.refresh();
      } else {
        // Masuk dengan Username & Password
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            throw new Error("Username atau kata sandi salah. Silakan coba lagi.");
          }
          throw error;
        }

        if (data.user) {
          // Verifikasi apakah akun sudah di-ACC oleh Admin
          const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_approved")
            .eq("id", data.user.id)
            .single();

          const isOwner =
            data.user.email?.includes("admin") ||
            data.user.user_metadata?.username === "faidhil" ||
            data.user.user_metadata?.username === "faidhil27";

          const isAdmin = profile?.role === "admin" || isOwner;
          const isApproved =
            isAdmin ||
            profile?.is_approved === true ||
            data.user.user_metadata?.is_approved === true;

          // JIKA BELUM DI-ACC OLEH ADMIN:
          if (!isApproved) {
            await supabase.auth.signOut();
            setErrorMessage("Akun ini belum diresmikan, hubungi admin");
            setLoading(false);
            return;
          }

          // JIKA SUDAH DI-ACC:
          router.push("/");
          router.refresh();
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      setErrorMessage(err.message || "Gagal melakukan autentikasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-white overflow-hidden">
      {/* Background Watermark */}
      <BackgroundMascot />

      {/* Main Login Card */}
      <div className="relative z-10 w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-purple-500/5">
        {/* Brand & Logo */}
        <div className="text-center mb-6">
          <div className="relative w-16 h-16 mx-auto mb-3">
            <Image
              src="/images/cipuy-robot.png"
              alt="Cipuy AI"
              fill
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            CIPUY AI
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Asisten Cerdas Pribadi • Akses Terverifikasi & Aman
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex p-1 bg-slate-100 rounded-2xl mb-5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setErrorMessage("");
              setSuccessNotice("");
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              !isSignUp
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Masuk</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setErrorMessage("");
              setSuccessNotice("");
            }}
            className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              isSignUp
                ? "bg-white text-purple-700 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Ajukan Akun</span>
          </button>
        </div>

        {/* Success / Pending Notice */}
        {successNotice && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 animate-in fade-in">
            <Clock className="w-4 h-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-amber-800">Menunggu Verifikasi Admin</p>
              <p className="leading-relaxed text-[11px] text-amber-700">{successNotice}</p>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-0.5">
              <p className="font-bold text-rose-900">Perhatian</p>
              <p className="font-medium text-xs leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Misal: Faidhil"
                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Username / Nama Pengguna
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Misal: faidhil27"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Kata Sandi
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md shadow-purple-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin">⏳</span>
            ) : isSignUp ? (
              <>
                <span>Kirim Pengajuan Akun</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Masuk ke Cipuy</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Informative Note */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-[11px] text-slate-400">
          <Shield className="w-3.5 h-3.5 flex-shrink-0 text-purple-600 mt-0.5" />
          <span>
            {isSignUp
              ? "Setiap pendaftaran baru akan diajukan ke Administrator untuk diresmikan (ACC) sebelum dapat digunakan."
              : "Akun yang belum diresmikan oleh Administrator tidak dapat masuk ke sistem."}
          </span>
        </div>
      </div>
    </div>
  );
}
