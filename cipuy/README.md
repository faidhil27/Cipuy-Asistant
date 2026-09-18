# 🤖 CIPUY AI — Asisten Cerdas Pribadi

Aplikasi web AI pribadi bernama **Cipuy** berbasis **Next.js (App Router), TypeScript, Tailwind CSS**, dengan backend database & autentikasi **Supabase**, serta kecerdasan buatan **Google Gemini API** (Gemini Pro / Flash).

Dirancang responsif untuk **Browser HP (Mobile)** dan **Komputer (Desktop)**, dengan tema **putih bersih** beraksen ungu-cyan, background maskot robot yang elegan tanpa menutupi tulisan, serta dilengkapi **Dashboard Administrator** untuk memantau prompt seluruh pengguna dan membersihkan database Supabase agar hemat kuota.

---

## 🌟 Fitur Unggulan

1. **Brand CIPUY & Maskot Robot:**
   - Logo resmi CIPUY dan maskot robot cerdas.
   - Background watermark robotik yang lembut (*opacity* terkontrol dan *pointer-events: none*) sehingga **teks 100% terbaca jelas tanpa tertabrak**.
2. **Responsif Sempurna Mobile & Desktop:**
   - **HP / Mobile:** *Header* ramping, menu *drawer slide-out* untuk riwayat obrolan, dan input bar yang aman dari tumpang-tindih keyboard (*safe area*).
   - **Desktop:** *Sidebar* luas dengan fitur pencarian obrolan, penggantian nama (*rename*), hapus, serta tombol ke panel admin.
3. **Autentikasi & Hak Akses (Supabase Auth):**
   - Halaman login & registrasi dengan proteksi sesi.
   - **Akun pendaftar pertama otomatis mendapatkan hak SUPER ADMIN**.
4. **Dashboard Administrator (`/admin`):**
   - **Pemantau Prompt:** Memantau semua pertanyaan pengguna dan balasan AI secara transparan.
   - **Pembersih Kuota Database (Purge Engine):** Opsi hapus obrolan lama (> 7 hari, > 14 hari, > 30 hari, atau reset total) agar kuota gratis Supabase tidak penuh.
   - Statistik riil: Jumlah pengguna, sesi percakapan, dan total pesan.
5. **Kaya Fitur & Semua Tombol Berfungsi:**
   - 🎙️ **Speech-to-Text (Input Suara):** Berbicara langsung menggunakan mikrofon.
   - 🔊 **Text-to-Speech (Cipuy Berbicara):** Dengarkan pembacaan jawaban dengan suara ramah.
   - 📋 **Copy Code & Text:** Tombol sekali klik untuk menyalin kode program atau seluruh balasan.
   - 🔄 **Regenerate Response:** Mengulang balasan jika ingin jawaban alternatif.
   - ⚙️ **Pengaturan Karakter AI (Settings):** Ubah temperatur (*kreativitas*) dan instruksi sistem (*system prompt*) Cipuy sesuai kebutuhan.
   - 📥 **Export Obrolan:** Unduh percakapan dalam format `.md` (Markdown), `.txt`, atau `.json`.
   - 💡 **Starter Prompts:** Saran pertanyaan cepat di halaman utama.

---

## 📁 Struktur Folder Proyek

```
Belajar Buat AI/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx             # Halaman Login & Registrasi
│   ├── admin/
│   │   └── page.tsx                   # Dashboard Admin (Cek prompt & Purge)
│   ├── api/
│   │   ├── chat/route.ts              # Endpoint Chat (Supabase + Gemini)
│   │   ├── admin/logs/route.ts        # Endpoint Log Admin
│   │   └── admin/purge/route.ts       # Endpoint Purge Database
│   ├── globals.css                    # Styling putih modern & custom scrollbar
│   ├── layout.tsx                     # Layout utama & metadata
│   └── page.tsx                       # Halaman Chat Utama Cipuy
├── components/
│   ├── chat/                          # Area chat, bubble pesan, input suara, settings
│   └── layout/                        # Sidebar, header HP, drawer HP, watermark robot
├── lib/
│   ├── supabase/                      # Client Supabase (Browser, Server, Admin)
│   ├── gemini.ts                      # Integrasi Google Gemini API
│   └── utils.ts                       # Helper styling & format tanggal
├── public/images/
│   ├── cipuy-logo.png                 # Logo resmi CIPUY
│   └── cipuy-robot.png                # Maskot robot CIPUY
├── supabase/
│   └── schema.sql                     # Script SQL database lengkap
├── .env.example                       # Contoh konfigurasi environment
├── .gitignore                         # Pengaman agar API key tidak bocor ke Git
├── package.json
└── README.md
```

---

## 🚀 Panduan Setup Langkah Demi Langkah

### Langkah 1: Setup Supabase Database

1. Buka [Supabase](https://supabase.com/) dan buat proyek baru (*New Project*).
2. Masuk ke menu **SQL Editor** di panel kiri dashboard Supabase.
3. Buka file `supabase/schema.sql` pada proyek ini, salin seluruh isinya, tempelkan ke SQL Editor Supabase, lalu klik tombol **Run**.
4. Buka menu **Project Settings** (ikon gerigi) -> **API**.
   - Salin **Project URL** (menjadi `NEXT_PUBLIC_SUPABASE_URL`).
   - Salin **anon / public key** (menjadi `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
   - Salin **service_role key** (menjadi `SUPABASE_SERVICE_ROLE_KEY`).

---

### Langkah 2: Dapatkan Google Gemini API Key

1. Kunjungi [Google AI Studio](https://aistudio.google.com/).
2. Masuk dengan akun Google Anda.
3. Klik tombol **Get API Key** -> **Create API Key**.
4. Salin kunci API yang didapatkan (menjadi `GEMINI_API_KEY`).

---

### Langkah 3: Upload Seluruh Folder ke GitHub

Buka terminal di folder proyek ini (`Belajar Buat AI`), lalu jalankan:

```bash
git init
git add .
git commit -m "Initial commit: Cipuy AI Application"
git branch -M main
git remote add origin https://github.com/USERNAME_ANDA/NAMA_REPO_ANDA.git
git push -u origin main
```

*(Atau gunakan aplikasi **GitHub Desktop** jika ingin melalui tampilan visual tanpa mengetik command).*

---

### Langkah 4: Hubungkan & Deploy ke Vercel

1. Buka [Vercel](https://vercel.com/) dan login menggunakan akun GitHub Anda.
2. Klik tombol **Add New...** -> **Project**.
3. Pilih repositori GitHub `Cipuy AI` yang baru saja Anda upload, lalu klik **Import**.
4. Pada bagian **Environment Variables**, tambahkan variabel berikut:

| Nama Variabel | Nilai | Keterangan |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | URL proyek Supabase Anda |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJh...` | Anon/Public API key Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJh...` | Service Role key Supabase (khusus admin) |
| `GEMINI_API_KEY` | `AIza...` | API Key dari Google AI Studio |
| `GEMINI_MODEL` | `gemini-1.5-pro` | Model AI (bisa `gemini-1.5-pro` atau `gemini-2.0-flash`) |

5. Klik tombol **Deploy**!
6. Dalam 1-2 menit, aplikasi Cipuy AI Anda sudah aktif secara live di internet dan bisa langsung dibuka dari browser HP maupun laptop!

---

### Langkah 5: Masuk Pertama Kali Sebagai Admin

1. Buka link Vercel yang sudah jadi di browser Anda.
2. Anda akan otomatis diarahkan ke halaman `/login`.
3. Klik tab **Daftar Akun**, masukkan nama, email, dan kata sandi Anda.
4. Karena Anda adalah **pendaftar pertama**, database Supabase otomatis menetapkan peran Anda sebagai **Administrator**.
5. Di menu sidebar (Desktop) atau drawer (HP), Anda akan melihat tombol **Panel Admin** yang mengarahkan ke `/admin` untuk memantau semua riwayat prompt dan melakukan *purge* pembersihan kuota.

---

Selamat menggunakan **CIPUY AI**! 🚀

