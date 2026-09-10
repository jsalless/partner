"use client";

import { useState, useEffect } from "react";
import { IoMdNotificationsOutline } from "react-icons/io";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
    const [userName, setUserName] = useState("Johnn");
    const [avatarUrl, setAvatarUrl] = useState("/avatar1.svg");
    const [userId, setUserId] = useState<string>("");

    useEffect(() => {
        try {
            const rawUser = localStorage.getItem("partner_user") || sessionStorage.getItem("partner_user");
            if (rawUser) {
                const user = JSON.parse(rawUser);
                const name = user.first_name || user.full_name?.split(" ")[0] || user.name || "Johnn";
                setUserName(name);
                if (user.id) {
                    setUserId(user.id);
                }

                const photo =
                    user.avatar_url ||
                    user.avatar ||
                    user.photo_url ||
                    user.picture ||
                    user.user_metadata?.avatar_url ||
                    user.user_metadata?.picture ||
                    user.user_metadata?.avatar;

                if (photo) {
                    setAvatarUrl(photo);
                } else {
                    setAvatarUrl("/avatar1.svg");
                }
            }
        } catch {
            // Mantém os padrões em caso de falha de leitura
        }
    }, []);

    return (
        <div className="p-10 w-full h-full">
            {/* Header */}
            <header className="flex justify-between items-center mb-12">
                <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Bom dia, {userName}!</h1>
                <div className="flex items-center space-x-6">
                    <div className="relative cursor-pointer p-2 rounded-full hover:bg-zinc-100 transition-colors flex items-center justify-center">
                        <IoMdNotificationsOutline size={38} className="text-zinc-800" />
                        <span className="absolute top-0.5 right-0.5 min-w-[1.25rem] h-5 px-1 bg-red-500 rounded-full border-2 border-[#f5f5f5] text-[10px] font-bold text-white flex items-center justify-center shadow-sm">
                            3
                        </span>
                    </div>
                    <Link
                        href={userId ? `/perfil/${userId}` : "/perfil"}
                        title="Ver meu perfil"
                        className="w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] rounded-full overflow-hidden bg-zinc-200 border-2 border-zinc-300 shadow-md flex items-center justify-center transition-transform hover:scale-105 shrink-0 cursor-pointer"
                    >
                        <img
                            src={avatarUrl}
                            alt="Foto do Usuário"
                            className="w-full h-full object-cover"
                            onError={() => setAvatarUrl("/avatar1.svg")}
                        />
                    </Link>
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
                <div className="bg-[#1b2541] border border-[#f00a98]/30 rounded-2xl p-6 text-white shadow-xl h-[340px] flex flex-col relative overflow-hidden">
                    {/* Decorative blur blob */}
                    <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[#f00a98]/20 blur-[50px] rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 bg-[#fbbf24]/20 blur-[50px] rounded-full pointer-events-none"></div>

                    <div className="flex justify-between items-center mb-4 relative z-10">
                        <h3 className="font-semibold text-lg">Eventos</h3>
                        <div className="flex items-center space-x-2 text-[#fbbf24] text-sm font-medium">
                            <button className="hover:text-[#f59e0b] transition-colors">←</button>
                            <span>Outubro</span>
                            <button className="hover:text-[#f59e0b] transition-colors">→</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-2 relative z-10">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(day => (
                            <div key={day} className="text-center text-xs font-semibold text-[#f00a98]">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-y-3 gap-x-2 flex-1 content-center items-center relative z-10">
                        {[...Array(31)].map((_, i) => {
                            const day = i + 1;
                            const isToday = day === 10;
                            const isEvent = [14, 16, 19].includes(day);

                            let className = "w-8 h-8 md:w-9 md:h-9 mx-auto flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer ";

                            if (isToday) {
                                className += "bg-[#f00a98] text-white shadow-lg shadow-[#f00a98]/40 scale-110";
                            } else if (isEvent) {
                                className += "bg-[#fbbf24] text-[#1b2541] hover:bg-[#f59e0b] hover:scale-110 shadow-md shadow-[#fbbf24]/20";
                            } else {
                                className += "text-zinc-300 hover:bg-white/10 hover:text-white";
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
                    <div className="bg-white rounded-2xl p-3 flex items-center space-x-4 shadow-sm border border-transparent hover:border-[#fbbf24]/50 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group">
                        <div className="bg-[#1b2541] group-hover:bg-[#fbbf24] transition-colors duration-300 w-[72px] h-[72px] rounded-2xl flex flex-col justify-center items-center shrink-0">
                            <span className="text-2xl font-black text-[#fbbf24] group-hover:text-[#1b2541] transition-colors duration-300">14</span>
                            <span className="text-xs font-bold text-zinc-300 group-hover:text-[#1b2541]/80 mt-[-2px] transition-colors duration-300">DOM</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-zinc-900 text-[17px] leading-tight mb-1 group-hover:text-[#f59e0b] transition-colors duration-300">Feira Cultural da Praça</h4>
                            <p className="text-[13px] text-zinc-600 line-clamp-2 leading-snug">A feira cultural estará ...</p>
                        </div>
                    </div>

                    {/* Event 2 */}
                    <div className="bg-white rounded-2xl p-3 flex items-center space-x-4 shadow-sm border border-transparent hover:border-[#fbbf24]/50 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group">
                        <div className="bg-[#1b2541] group-hover:bg-[#fbbf24] transition-colors duration-300 w-[72px] h-[72px] rounded-2xl flex flex-col justify-center items-center shrink-0">
                            <span className="text-2xl font-black text-[#fbbf24] group-hover:text-[#1b2541] transition-colors duration-300">16</span>
                            <span className="text-xs font-bold text-zinc-300 group-hover:text-[#1b2541]/80 mt-[-2px] transition-colors duration-300">TER</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-zinc-900 text-[17px] leading-tight mb-1 group-hover:text-[#f59e0b] transition-colors duration-300">Aulas de flauta</h4>
                            <p className="text-[13px] text-zinc-600 line-clamp-2 leading-snug">Flautistas do DF, as aulas de flauta transversal estão de v...</p>
                        </div>
                    </div>

                    {/* Event 3 */}
                    <div className="bg-white rounded-2xl p-3 flex items-center space-x-4 shadow-sm border border-transparent hover:border-[#fbbf24]/50 hover:shadow-md hover:-translate-y-1 transition-all cursor-pointer group">
                        <div className="bg-[#1b2541] group-hover:bg-[#fbbf24] transition-colors duration-300 w-[72px] h-[72px] rounded-2xl flex flex-col justify-center items-center shrink-0">
                            <span className="text-2xl font-black text-[#fbbf24] group-hover:text-[#1b2541] transition-colors duration-300">19</span>
                            <span className="text-xs font-bold text-zinc-300 group-hover:text-[#1b2541]/80 mt-[-2px] transition-colors duration-300">SEX</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-zinc-900 text-[17px] leading-tight mb-1 group-hover:text-[#f59e0b] transition-colors duration-300">Dedé espetos</h4>
                            <p className="text-[13px] text-zinc-600 line-clamp-2 leading-snug">Dedé espetos fará uma aparição com muito churrasco no Gama</p>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
