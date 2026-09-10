import Link from "next/link";
import { Bookmark, PlusCircle } from "lucide-react";
import { TiHome } from "react-icons/ti";
import { FaFolderOpen } from "react-icons/fa";
import { FaChartSimple } from "react-icons/fa6";
import { BsFillPeopleFill } from "react-icons/bs";

import Image from "next/image";

export function Navbar() {
  return (
    <nav className="w-64 min-h-screen bg-[#1a1a1a] text-white flex flex-col pt-8 border-r border-zinc-800 shrink-0">
      <div className="px-6 mb-12 flex items-center justify-center">
        <div className="w-48 h-auto flex items-center justify-center relative">
          <Image src="/Logo.svg" alt="Partner Logo" width={192} height={192} className="w-full h-auto object-contain" priority />
        </div>
      </div>

      <div className="flex-1 px-4 flex flex-col space-y-2">
        <Link
          href="/"
          className="flex items-center space-x-3 px-4 py-3 bg-[#f00a98] text-white rounded-xl transition-colors font-medium"
        >
          <TiHome size={20} />
          <span>Início</span>
        </Link>
        <Link
          href="/projetos"
          className="flex items-center space-x-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors font-medium"
        >
          <FaFolderOpen size={20} />
          <span>Projetos</span>
        </Link>
        <Link
          href="/powerBI"
          className="flex items-center space-x-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors font-medium"
        >
          <FaChartSimple size={20} />
          <span>Power BI</span>
        </Link>
        <Link
          href="/sugerir"
          className="flex items-center space-x-3 px-4 py-3 text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors font-medium"
        >
          <BsFillPeopleFill size={20} />
          <span>Equipes</span>
        </Link>
      </div>
    </nav>
  );
}
