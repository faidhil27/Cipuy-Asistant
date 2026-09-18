import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "CIPUY AI — Asisten Cerdas Pribadi",
  description: "Aplikasi AI web pribadi Cipuy bertenaga Google Gemini & Supabase",
  icons: {
    icon: "/images/cipuy-robot.png",
    apple: "/images/cipuy-robot.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans bg-white text-slate-900 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}

