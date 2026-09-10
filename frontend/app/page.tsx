import { Bell } from "lucide-react";
import Image from "next/image";

export default function Home() {
  return (
    <div className="p-10 w-full h-full">
      {/* Header */}
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Bom dia, Johnn!</h1>
        <div className="flex items-center space-x-6">
          <div className="relative cursor-pointer">
            <Bell size={24} className="text-zinc-800" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#f5f5f5] text-[9px] font-bold text-white flex items-center justify-center">
              3
            </span>
          </div>
          <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-300">
            {/* Avatar Placeholder */}
            <img
              src="https://api.dicebear.com/9.x/avataaars/svg?seed=Johnn"
              alt="User Avatar"
              className="w-full h-full object-cover bg-teal-100"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-8">

        {/* Banner */}
        <div className="xl:col-span-2 lg:col-span-2 bg-[#1b2541] rounded-2xl p-10 flex flex-col justify-between relative overflow-hidden h-[340px]">
          <div className="z-10 w-2/3">
            <h2 className="text-4xl font-semibold text-white leading-tight mb-6">
              Projetos melhores<br />acontecem juntos.
            </h2>
            <button className="bg-[#fbbf24] text-black font-semibold px-5 py-2.5 rounded-lg flex items-center space-x-2 hover:bg-[#f59e0b] transition-colors text-sm">
              <span>Ir para equipes</span>
              <span className="text-lg leading-none transform -rotate-45 block mb-1">→</span>
            </button>
          </div>

          {/* Illustration */}
          <div className="absolute right-0 bottom-0 w-2/3 h-[120%] pointer-events-none flex justify-end items-end translate-y-16">
            <Image src="/DuoPartner.svg" alt="Characters talking" width={400} height={400} className="w-full h-full object-contain object-right-bottom" />
          </div>
        </div>

        {/* Calendar Widget */}
        <div className="bg-black/80 backdrop-blur-md border border-white/20 rounded-2xl p-6 text-white shadow-xl h-[340px] flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-lg">Eventos</h3>
            <div className="flex items-center space-x-2 text-red-500 text-sm font-medium">
              <button className="hover:text-red-400">←</button>
              <span>Outubro</span>
              <button className="hover:text-red-400">→</button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-zinc-400">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-3 gap-x-2 flex-1 content-center items-center">
            {[...Array(31)].map((_, i) => {
              const day = i + 1;
              const isToday = day === 10;
              const isEvent = [14, 16, 19].includes(day);

              let className = "w-8 h-8 md:w-9 md:h-9 mx-auto flex items-center justify-center rounded-xl text-sm font-medium transition-colors cursor-pointer ";

              if (isToday) {
                className += "bg-[#ef4444] text-white";
              } else if (isEvent) {
                className += "border border-[#ef4444] text-white hover:bg-zinc-700";
              } else {
                className += "text-zinc-300 hover:bg-zinc-700";
              }

              return (
                <div key={day} className="flex justify-center">
                  <div className={className}>
                    {day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Events List */}
        <div className="flex flex-col justify-between h-[340px] gap-4 overflow-y-auto pr-2">
          {/* Event 1 */}
          <div className="bg-white rounded-2xl p-3 flex items-center space-x-4 shadow-sm">
            <div className="bg-[#ffb3b3] w-[72px] h-[72px] rounded-2xl flex flex-col justify-center items-center shrink-0">
              <span className="text-2xl font-black text-[#f43f5e]">14</span>
              <span className="text-xs font-bold text-white mt-[-2px]">DOM</span>
            </div>
            <div>
              <h4 className="font-bold text-zinc-900 text-[17px] leading-tight mb-1">Feira Cultural da Praça</h4>
              <p className="text-[13px] text-zinc-600 line-clamp-2 leading-snug">A feira cultural estará ...</p>
            </div>
          </div>

          {/* Event 2 */}
          <div className="bg-white rounded-2xl p-3 flex items-center space-x-4 shadow-sm">
            <div className="bg-[#ffb3b3] w-[72px] h-[72px] rounded-2xl flex flex-col justify-center items-center shrink-0">
              <span className="text-2xl font-black text-[#f43f5e]">16</span>
              <span className="text-xs font-bold text-white mt-[-2px]">TER</span>
            </div>
            <div>
              <h4 className="font-bold text-zinc-900 text-[17px] leading-tight mb-1">Aulas de flauta</h4>
              <p className="text-[13px] text-zinc-600 line-clamp-2 leading-snug">Flautistas do DF, as aulas de flauta transversal estão de v...</p>
            </div>
          </div>

          {/* Event 3 */}
          <div className="bg-white rounded-2xl p-3 flex items-center space-x-4 shadow-sm">
            <div className="bg-[#ffb3b3] w-[72px] h-[72px] rounded-2xl flex flex-col justify-center items-center shrink-0">
              <span className="text-2xl font-black text-[#f43f5e]">19</span>
              <span className="text-xs font-bold text-white mt-[-2px]">SEX</span>
            </div>
            <div>
              <h4 className="font-bold text-zinc-900 text-[17px] leading-tight mb-1">Dedé espetos</h4>
              <p className="text-[13px] text-zinc-600 line-clamp-2 leading-snug">Dedé espetos fará uma aparição com muito churrasco no Gama</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
