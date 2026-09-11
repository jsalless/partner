"use client";

import Image from "next/image";
import { League_Gothic } from "next/font/google";
import { useState } from "react";

const leagueGothic = League_Gothic({
  subsets: ["latin"],
  weight: ["400"],
});

export default function Equipes() {
  const [activeTab, setActiveTab] = useState<"minhas" | "explorar">("minhas");

  return (
    <div className="w-full min-h-full flex flex-col relative overflow-hidden">
      {/* Banner */}
      <div className="w-full bg-[#141735] relative px-12 pt-36 pb-48 flex justify-between items-center shadow-md min-h-[500px]">

        {/* Title */}
        <h1
          className={`text-8xl md:text-[200px] xl:text-[200px] leading-none font-black text-white tracking-tighter uppercase z-10 ${leagueGothic.className}`}
          style={{ transform: 'scaleY(1.3)', transformOrigin: 'left' }}
        >
          EQUIPES
        </h1>

        {/* Illustration */}
        <div className="absolute right-4 md:right-16 bottom-[-30px] z-20 w-[450px] md:w-[750px] pointer-events-none">
          <Image
            src="/EquipePartner.svg"
            alt="Personagens Equipe Partner"
            width={900}
            height={700}
            className="w-full h-auto object-contain object-bottom drop-shadow-2xl"
            priority
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-12 flex-1 w-full max-w-7xl mx-auto flex flex-col items-center">
        {/* Actions */}
        <div className="flex gap-4 bg-white p-1.5 rounded-full shadow-lg mt-[10px] z-30 relative border border-gray-100">
          <button
            onClick={() => setActiveTab("minhas")}
            className={`px-8 py-2.5 rounded-full font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === "minhas"
              ? "bg-[#f00a98] text-white shadow-md"
              : "text-gray-500 hover:text-[#141735]"
              }`}
          >
            Minhas Equipes
          </button>
          <button
            onClick={() => setActiveTab("explorar")}
            className={`px-8 py-2.5 rounded-full font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === "explorar"
              ? "bg-[#f00a98] text-white shadow-md"
              : "text-gray-500 hover:text-[#141735]"
              }`}
          >
            Explorar
          </button>
        </div>
        {/* Future content goes here */}
      </div>
    </div>
  );
}
