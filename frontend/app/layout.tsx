import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Partner",
  description: "Partner — Gestão Ágil, Equipes & Dashboard Executivo",
  icons: {
    icon: "/Favicon.svg",
    shortcut: "/Favicon.svg",
    apple: "/Favicon.svg",
  },
};

import { Navbar } from "@/components/navbar";
import { ToastProvider } from "@/components/toastProvider";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen flex bg-[#FDFBFA] text-zinc-900 overflow-x-hidden">
        <Navbar />
        <main className="flex-1 min-w-0 min-h-screen overflow-y-auto">
          {children}
        </main>
        <ToastProvider />
      </body>
    </html>
  );
}
