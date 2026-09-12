"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { TiHome } from "react-icons/ti";
import { FaFolderOpen } from "react-icons/fa";
import { FaChartSimple } from "react-icons/fa6";
import { BsFillPeopleFill } from "react-icons/bs";
import { FiLogOut } from "react-icons/fi";
import { toast } from "react-toastify";
import Image from "next/image";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Não exibe a barra lateral na página de login
  if (pathname === "/login") {
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("partner_token") ||
            sessionStorage.getItem("partner_token")
          : null;

      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }).catch(() => {});
      }
    } catch {
      // Ignora erro de rede para garantir o logout local
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("partner_token");
        localStorage.removeItem("partner_user");
        sessionStorage.removeItem("partner_token");
        sessionStorage.removeItem("partner_user");
        toast.info("Sessão encerrada com sucesso.");
        setTimeout(() => {
          window.location.href = "/login";
        }, 300);
      }
    }
  };

  const isHomeActive = pathname === "/home" || pathname === "/";
  const isEquipesActive = pathname?.startsWith("/equipes");
  const isProjetosActive = pathname?.startsWith("/projetos");
  const isPowerBIActive = pathname?.startsWith("/powerBI");

  return (
    <nav className="w-64 h-screen sticky top-0 bg-[#1a1a1a] text-white flex flex-col pt-8 border-r border-zinc-800 shrink-0 z-30 select-none overflow-hidden">
      <div className="px-6 mb-8 flex items-center justify-center shrink-0">
        <div className="w-48 h-auto flex items-center justify-center relative">
          <Image
            src="/Logo.svg"
            alt="Partner Logo"
            width={192}
            height={192}
            className="w-full h-auto object-contain"
            style={{ width: "100%", height: "auto" }}
            priority
          />
        </div>
      </div>

      <div className="flex-1 px-4 flex flex-col space-y-2 overflow-hidden">
        <Link
          href="/home"
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${
            isHomeActive
              ? "bg-[#f00a98] text-white"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <TiHome size={20} />
          <span>Início</span>
        </Link>
        <Link
          href="/equipes"
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${
            isEquipesActive
              ? "bg-[#f00a98] text-white"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <BsFillPeopleFill size={20} />
          <span>Equipes</span>
        </Link>
        <Link
          href="/projetos"
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${
            isProjetosActive
              ? "bg-[#f00a98] text-white"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <FaFolderOpen size={20} />
          <span>Projetos</span>
        </Link>
        <Link
          href="/powerBI"
          className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-colors font-medium ${
            isPowerBIActive
              ? "bg-[#f00a98] text-white"
              : "text-zinc-300 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <FaChartSimple size={20} />
          <span>Power BI</span>
        </Link>
      </div>

      {/* Botão Finalizar Sessão no nível da navbar */}
      <div className="p-4 mt-auto border-t border-zinc-800/80">
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="w-full py-2.5 px-4 rounded-2xl border border-zinc-700/90 hover:border-zinc-500 bg-transparent hover:bg-zinc-800/60 text-zinc-300 hover:text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <FiLogOut size={16} className="text-zinc-400 group-hover:text-white" />
          <span>{isLoggingOut ? "Finalizando..." : "Finalizar sessão"}</span>
        </button>
      </div>
    </nav>
  );
}
