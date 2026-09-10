"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TiHome } from "react-icons/ti";
import { FaFolderOpen } from "react-icons/fa";
import { FaChartSimple } from "react-icons/fa6";
import { BsFillPeopleFill } from "react-icons/bs";
import Image from "next/image";

export function Navbar() {
  const pathname = usePathname();

  // Não exibe a barra lateral na página de login
  if (pathname === "/login") {
    return null;
  }

  const isHomeActive = pathname === "/home" || pathname === "/";
  const isEquipesActive = pathname?.startsWith("/equipes");
  const isProjetosActive = pathname?.startsWith("/projetos");
  const isPowerBIActive = pathname?.startsWith("/powerBI");

  return (
    <nav className="w-64 min-h-screen bg-[#1a1a1a] text-white flex flex-col pt-8 border-r border-zinc-800 shrink-0">
      <div className="px-6 mb-12 flex items-center justify-center">
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

      <div className="flex-1 px-4 flex flex-col space-y-2">
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
    </nav>
  );
}
