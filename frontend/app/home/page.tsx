"use client";

import { useState, useEffect, useMemo } from "react";
import { IoMdNotificationsOutline } from "react-icons/io";
import { FiCalendar, FiClock, FiLayers, FiFolder, FiCheckCircle, FiArrowRight, FiAward, FiTrendingUp, FiDollarSign, FiUsers, FiTarget, FiStar, FiActivity, FiArrowUpRight } from "react-icons/fi";
import Image from "next/image";
import Link from "next/link";
import { NotificationsModal } from "@/components/notificationsModal";

interface TaskItem {
    id: string;
    kanban_id: string;
    project_id?: string | null;
    project_name?: string | null;
    title: string;
    description?: string | null;
    status: string;
    priority: string;
    due_date?: string | null;
    assignee_id?: string | null;
}

const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

export default function Home() {
    const [userName, setUserName] = useState("Johnn");
    const [avatarUrl, setAvatarUrl] = useState("/Avatar1.svg");
    const [userId, setUserId] = useState<string>("");
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    // Estado do Calendário e Tarefas
    const [currentDate, setCurrentDate] = useState(new Date());
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [selectedDay, setSelectedDay] = useState<number | null>(null);

    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    const getAuthHeader = (): Record<string, string> => {
        if (typeof window === "undefined") return {};
        const token =
            localStorage.getItem("partner_token") || sessionStorage.getItem("partner_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

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
                    user.default_avatar ||
                    user.avatar ||
                    user.photo_url ||
                    user.picture ||
                    user.user_metadata?.avatar_url ||
                    user.user_metadata?.default_avatar ||
                    user.user_metadata?.picture ||
                    user.user_metadata?.avatar ||
                    "/Avatar1.svg";

                setAvatarUrl(photo);
                fetchUnreadCount(user.id);
            }
        } catch {
            // Mantém os padrões em caso de falha de leitura
        }
    }, []);

    const fetchUnreadCount = async (uid?: string) => {
        const targetId = uid || userId;
        if (!targetId) return;
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/unread-count?user_id=${targetId}`, {
                headers: getAuthHeader(),
            });
            if (res.ok) {
                const data = await res.json();
                setUnreadCount(data.unread_count ?? 0);
            }
        } catch {
            // Silencioso para não poluir UI
        }
    };

    // Buscar tarefas do usuário no banco de dados
    const fetchUserTasks = async (uid: string) => {
        if (!uid) return;
        setLoadingTasks(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/users/${uid}/tasks`, {
                headers: getAuthHeader(),
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data || []);
            }
        } catch (err) {
            console.error("Erro ao buscar tarefas do usuário:", err);
        } finally {
            setLoadingTasks(false);
        }
    };

    useEffect(() => {
        if (!userId) return;
        fetchUnreadCount(userId);
        fetchUserTasks(userId);
        const interval = setInterval(() => {
            fetchUnreadCount(userId);
        }, 15000);
        return () => clearInterval(interval);
    }, [userId]);

    // Navegação de Mês
    const handlePrevMonth = () => {
        setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
        setSelectedDay(null);
    };

    const handleNextMonth = () => {
        setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
        setSelectedDay(null);
    };

    // Cálculos do Calendário Dinâmico
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    // getDay(): 0 = Domingo, 1 = Segunda... Ajustando para Seg=0, Dom=6
    const firstDayIndex = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7;

    const realToday = new Date();
    const isCurrentRealMonth =
        realToday.getFullYear() === currentYear && realToday.getMonth() === currentMonth;
    const realTodayDay = realToday.getDate();

    // Tarefas agrupadas por dia neste mês
    const tasksByDay = useMemo(() => {
        const map: Record<number, TaskItem[]> = {};
        tasks.forEach((task) => {
            if (!task.due_date) return;
            try {
                // due_date formato: YYYY-MM-DD
                const parts = task.due_date.split("-");
                if (parts.length === 3) {
                    const y = parseInt(parts[0], 10);
                    const m = parseInt(parts[1], 10) - 1;
                    const d = parseInt(parts[2], 10);
                    if (y === currentYear && m === currentMonth) {
                        if (!map[d]) map[d] = [];
                        map[d].push(task);
                    }
                }
            } catch {}
        });
        return map;
    }, [tasks, currentYear, currentMonth]);

    // Tarefas para exibir na lista lateral
    const displayedTasks = useMemo(() => {
        if (selectedDay !== null) {
            return tasksByDay[selectedDay] || [];
        }
        // Se nenhum dia selecionado, exibe todas as tarefas que têm prazo neste mês (ordenadas pelo dia)
        const monthTasks: TaskItem[] = [];
        Object.keys(tasksByDay)
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
            .forEach((d) => {
                monthTasks.push(...tasksByDay[parseInt(d, 10)]);
            });
        return monthTasks;
    }, [tasksByDay, selectedDay]);

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "in_progress":
                return { label: "Em Progresso", color: "bg-amber-100 text-amber-800" };
            case "review":
                return { label: "Em Revisão", color: "bg-indigo-100 text-indigo-800" };
            case "done":
                return { label: "Concluído", color: "bg-emerald-100 text-emerald-800" };
            default:
                return { label: "A Fazer", color: "bg-slate-100 text-slate-700" };
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case "high":
                return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 uppercase">Alta</span>;
            case "low":
                return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 uppercase">Baixa</span>;
            default:
                return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase">Média</span>;
        }
    };

    return (
        <div className="p-10 w-full h-full">
            {/* Header */}
            <header className="flex justify-between items-center mb-12">
                <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Bom dia, {userName}!</h1>
                <div className="flex items-center space-x-6">
                    <button
                        type="button"
                        onClick={() => setIsNotificationsOpen(true)}
                        className="relative cursor-pointer p-2 rounded-full hover:bg-zinc-100 transition-colors flex items-center justify-center border-none bg-transparent"
                        title="Ver notificações"
                        aria-label="Notificações"
                    >
                        <IoMdNotificationsOutline size={38} className="text-zinc-800 hover:text-zinc-950 transition-colors" />
                        {unreadCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 min-w-[1.25rem] h-5 px-1.5 bg-red-500 rounded-full border-2 border-[#f5f5f5] text-[10px] font-bold text-white flex items-center justify-center shadow-sm animate-in zoom-in duration-200">
                                {unreadCount > 99 ? "99+" : unreadCount}
                            </span>
                        )}
                    </button>

                    <Link
                        href={userId ? `/perfil/${userId}` : "/perfil"}
                        title="Ver meu perfil"
                        className="w-16 h-16 md:w-[4.5rem] md:h-[4.5rem] rounded-full overflow-hidden bg-zinc-200 border-2 border-zinc-300 shadow-md flex items-center justify-center transition-transform hover:scale-105 shrink-0 cursor-pointer"
                    >
                        <img
                            src={avatarUrl}
                            alt="Foto do Usuário"
                            className="w-full h-full object-cover"
                            onError={() => setAvatarUrl("/Avatar1.svg")}
                        />
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-8">

                {/* Banner com botão funcional para /equipes */}
                <div className="xl:col-span-2 lg:col-span-2 bg-[#1b2541] rounded-2xl p-10 flex flex-col justify-between relative overflow-hidden h-[360px]">
                    <div className="z-10 w-2/3">
                        <h2 className="text-4xl font-semibold text-white leading-tight mb-6">
                            Projetos melhores<br />acontecem juntos.
                        </h2>
                        <Link
                            href="/equipes"
                            className="bg-[#fbbf24] text-black font-semibold px-5 py-2.5 rounded-lg inline-flex items-center space-x-2 hover:bg-[#f59e0b] transition-colors text-sm cursor-pointer shadow-md active:scale-95"
                        >
                            <span>Ir para equipes</span>
                            <span className="text-lg leading-none transform -rotate-45 block mb-1">→</span>
                        </Link>
                    </div>

                    {/* Illustration */}
                    <div className="absolute right-0 bottom-0 w-2/3 h-[120%] pointer-events-none flex justify-end items-end translate-y-16">
                        <Image src="/DuoPartner.svg" alt="Characters talking" width={400} height={400} className="w-full h-full object-contain object-right-bottom" priority />
                    </div>
                </div>

                {/* Calendar Widget Dinâmico com Deadlines */}
                <div className="bg-[#1b2541] border border-[#f00a98]/30 rounded-2xl p-5 text-white shadow-xl h-[360px] flex flex-col relative overflow-hidden">
                    {/* Decorative blur blobs */}
                    <div className="absolute top-[-50px] right-[-50px] w-32 h-32 bg-[#f00a98]/20 blur-[50px] rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-[-50px] left-[-50px] w-32 h-32 bg-[#fbbf24]/20 blur-[50px] rounded-full pointer-events-none"></div>

                    {/* Header Centralizado: Entregas e Seleção do Mês em cima */}
                    <div className="flex flex-col items-center justify-center mb-2 relative z-10">
                        <h3 className="font-bold text-lg text-white tracking-wide">Entregas</h3>
                        <div className="flex items-center justify-center space-x-2 text-[#fbbf24] text-sm font-medium mt-0.5">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                title="Mês anterior"
                                className="hover:text-[#f59e0b] transition-colors px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer flex items-center justify-center"
                            >
                                ←
                            </button>
                            <span className="min-w-[130px] text-center capitalize select-none font-bold tracking-wide">
                                {MONTH_NAMES[currentMonth]} {currentYear}
                            </span>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                title="Próximo mês"
                                className="hover:text-[#f59e0b] transition-colors px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer flex items-center justify-center"
                            >
                                →
                            </button>
                        </div>
                    </div>

                    {/* Cabeçalho dos Dias da Semana */}
                    <div className="grid grid-cols-7 gap-2 mb-1.5 relative z-10">
                        {WEEKDAYS.map((day) => (
                            <div key={day} className="text-center text-xs font-semibold text-[#f00a98]">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Grade dos Dias */}
                    <div className="grid grid-cols-7 gap-y-1.5 gap-x-1.5 flex-1 content-center items-center relative z-10">
                        {/* Espaçadores para o primeiro dia do mês */}
                        {[...Array(firstDayIndex)].map((_, i) => (
                            <div key={`empty-${i}`} className="w-8 h-8 md:w-9 md:h-9" />
                        ))}

                        {/* Dias do mês */}
                        {[...Array(daysInMonth)].map((_, i) => {
                            const day = i + 1;
                            const isToday = isCurrentRealMonth && day === realTodayDay;
                            const dayTasks = tasksByDay[day] || [];
                            const hasTasks = dayTasks.length > 0;
                            const isSelected = selectedDay === day;

                            let className =
                                "w-8 h-8 md:w-9 md:h-9 mx-auto flex flex-col items-center justify-center rounded-xl text-xs md:text-sm font-medium transition-all duration-200 cursor-pointer relative ";

                            if (isSelected) {
                                className += "bg-[#EE0AAE] text-white shadow-lg ring-2 ring-white scale-110 font-bold";
                            } else if (hasTasks) {
                                className += "bg-[#fbbf24] text-[#1b2541] hover:bg-[#f59e0b] hover:scale-110 shadow-md shadow-[#fbbf24]/30 font-bold";
                            } else if (isToday) {
                                className += "bg-[#f00a98] text-white shadow-md shadow-[#f00a98]/30 font-bold";
                            } else {
                                className += "text-zinc-300 hover:bg-white/10 hover:text-white";
                            }

                            return (
                                <div key={day} className="flex justify-center">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                                        title={
                                            hasTasks
                                                ? `${dayTasks.length} tarefa(s) com entrega neste dia`
                                                : isToday
                                                ? "Hoje"
                                                : `Dia ${day}`
                                        }
                                        className={className}
                                    >
                                        <span>{day}</span>
                                        {hasTasks && !isSelected && (
                                            <span className="w-1 h-1 rounded-full bg-[#1b2541] absolute bottom-1" />
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Lista de Tarefas com Deadline */}
                <div className="flex flex-col h-[360px] overflow-y-auto pr-1">
                    <div className="flex items-center justify-between mb-2.5 shrink-0">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                            {selectedDay !== null
                                ? `Entregas em ${selectedDay} de ${MONTH_NAMES[currentMonth]}`
                                : `Entregas de ${MONTH_NAMES[currentMonth]}`}
                        </span>
                        {selectedDay !== null && (
                            <button
                                onClick={() => setSelectedDay(null)}
                                className="text-[11px] font-bold text-[#f00a98] hover:underline cursor-pointer"
                            >
                                Ver todos
                            </button>
                        )}
                    </div>

                    {displayedTasks.length === 0 ? (
                        <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-sm border border-gray-100 flex-1">
                            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#fbbf24] flex items-center justify-center mb-3">
                                <FiCalendar size={24} />
                            </div>
                            <h4 className="font-bold text-gray-800 text-sm mb-1">
                                {selectedDay !== null
                                    ? `Sem entregas no dia ${selectedDay}`
                                    : "Nenhuma entrega neste mês"}
                            </h4>
                            <p className="text-xs text-gray-500 max-w-[200px] mb-4">
                                {selectedDay !== null
                                    ? "Não há nenhuma tarefa agendada com entrega para este dia."
                                    : "Defina datas de entrega para suas tarefas no Kanban para vê-las aqui."}
                            </p>
                            <Link
                                href="/projetos"
                                className="text-xs font-bold text-[#EE0AAE] hover:underline flex items-center gap-1"
                            >
                                <span>Ver Projetos e Kanban</span>
                                <FiArrowRight size={12} />
                            </Link>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {displayedTasks.map((task) => {
                                let dayNum = "--";
                                let weekdayAbbr = "TASK";
                                if (task.due_date) {
                                    try {
                                        const dParts = task.due_date.split("-");
                                        dayNum = dParts[2] || "--";
                                        const dateObj = new Date(
                                            parseInt(dParts[0], 10),
                                            parseInt(dParts[1], 10) - 1,
                                            parseInt(dParts[2], 10)
                                        );
                                        weekdayAbbr = WEEKDAYS_SHORT[dateObj.getDay()] || "DIA";
                                    } catch {}
                                }
                                const statusInfo = getStatusLabel(task.status);

                                return (
                                    <Link
                                        key={task.id}
                                        href={task.project_id ? `/projetos/${task.project_id}` : "/projetos"}
                                        className="bg-white rounded-2xl p-3.5 flex items-center space-x-3.5 shadow-sm border border-transparent hover:border-[#fbbf24]/50 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group shrink-0"
                                    >
                                        {/* Badge do Dia */}
                                        <div className="bg-[#1b2541] group-hover:bg-[#fbbf24] transition-colors duration-300 w-[64px] h-[64px] rounded-2xl flex flex-col justify-center items-center shrink-0 shadow-sm">
                                            <span className="text-xl font-black text-[#fbbf24] group-hover:text-[#1b2541] transition-colors duration-300">
                                                {dayNum}
                                            </span>
                                            <span className="text-[10px] font-bold text-zinc-300 group-hover:text-[#1b2541]/80 mt-[-2px] transition-colors duration-300">
                                                {weekdayAbbr}
                                            </span>
                                        </div>

                                        {/* Informações da Tarefa */}
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                {task.project_name && (
                                                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[110px]">
                                                        {task.project_name}
                                                    </span>
                                                )}
                                                {getPriorityBadge(task.priority)}
                                            </div>
                                            <h4 className="font-bold text-zinc-900 text-sm leading-tight mb-1 group-hover:text-[#f59e0b] transition-colors duration-300 truncate">
                                                {task.title}
                                            </h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${statusInfo.color}`}>
                                                {statusInfo.label}
                                            </span>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>

            {/* Quick Corporate KPIs Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
                {/* KPI 1 */}
                <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Projetos Ativos</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-zinc-900">6</span>
                            <span className="text-xs font-bold text-emerald-600">100% no prazo</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 mt-0.5 block">5 squads em operação</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <FiFolder size={22} />
                    </div>
                </div>

                {/* KPI 2 */}
                <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Tarefas na Sprint</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-zinc-900">84</span>
                            <span className="text-xs font-bold text-[#f00a98]">52 concluídas</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 mt-0.5 block">18 em progresso ativo</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-pink-50 text-[#EE0AAE] flex items-center justify-center shrink-0">
                        <FiLayers size={22} />
                    </div>
                </div>

                {/* KPI 3 */}
                <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Taxa de Entrega</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-zinc-900">94.2%</span>
                            <span className="text-xs font-bold text-emerald-600">+6.4%</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 mt-0.5 block">SLA de sprint mantido</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <FiTrendingUp size={22} />
                    </div>
                </div>

                {/* KPI 4 */}
                <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-1">Colaboradores</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-black text-zinc-900">14</span>
                            <span className="text-xs font-bold text-amber-600">98% ativos</span>
                        </div>
                        <span className="text-[11px] text-zinc-400 mt-0.5 block">Engajamento semanal</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <FiUsers size={22} />
                    </div>
                </div>
            </div>

            {/* Main Featured Section: Membro do Mês + Meta de Faturamento */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">

                {/* Membro do Mês (Destaque) - 5 Cols */}
                <div className="lg:col-span-5 bg-gradient-to-br from-[#1b2541] via-[#141735] to-[#1b2541] rounded-2xl p-7 text-white border border-[#fbbf24]/40 shadow-xl relative overflow-hidden flex flex-col justify-between">
                    {/* Glow and decoration */}
                    <div className="absolute top-0 right-0 w-44 h-44 bg-[#fbbf24]/15 blur-[60px] rounded-full pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 w-44 h-44 bg-[#EE0AAE]/15 blur-[60px] rounded-full pointer-events-none"></div>

                    <div>
                        {/* Top Badge */}
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="inline-flex items-center gap-2 bg-[#fbbf24]/20 border border-[#fbbf24]/50 text-[#fbbf24] px-3 py-1 rounded-full text-xs font-bold tracking-wide shadow-sm">
                                <FiStar className="text-[#fbbf24]" size={14} />
                                <span>MEMBRO DO MÊS</span>
                            </div>
                            <span className="text-xs font-semibold text-zinc-400 bg-white/5 px-2.5 py-0.5 rounded-full border border-white/10">
                                Setembro 2026
                            </span>
                        </div>

                        {/* Member Bio Profile */}
                        <div className="flex items-center space-x-4 mb-6 relative z-10">
                            <div className="relative shrink-0">
                                <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-[#fbbf24] via-[#f00a98] to-[#EE0AAE] shadow-lg shadow-[#fbbf24]/20">
                                    <div className="w-full h-full rounded-full overflow-hidden bg-zinc-900">
                                        <img
                                            src="/Avatar2.svg"
                                            alt="Camila Duarte"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-[#fbbf24] text-zinc-950 p-1.5 rounded-full shadow-md font-bold text-xs">
                                    <FiAward size={14} />
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-bold text-white tracking-tight">Camila Duarte</h3>
                                <p className="text-xs font-semibold text-[#fbbf24] mt-0.5">Tech Lead • Squad Frontend & Core</p>
                                <p className="text-[11px] text-zinc-400 mt-1">@camila.duarte • 2 anos de Partner</p>
                            </div>
                        </div>

                        {/* Highlight Stats Badges */}
                        <div className="grid grid-cols-3 gap-2.5 mb-6 relative z-10">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                                <span className="block text-xl font-black text-[#fbbf24]">42</span>
                                <span className="text-[10px] text-zinc-300 font-medium">Entregas no Prazo</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                                <span className="block text-xl font-black text-emerald-400">99.4%</span>
                                <span className="text-[10px] text-zinc-300 font-medium">Aprovação em PRs</span>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                                <span className="block text-xl font-black text-[#EE0AAE]">3</span>
                                <span className="text-[10px] text-zinc-300 font-medium">Projetos Liderados</span>
                            </div>
                        </div>

                        {/* Recognition Quote */}
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 relative z-10">
                            <p className="text-xs text-zinc-300 italic leading-relaxed">
                                &ldquo;Liderança exemplar na estruturação dos novos módulos de Kanban, alta consistência técnica na sprint e mentoria contínua para o time de desenvolvimento.&rdquo;
                            </p>
                            <span className="text-[10px] font-bold text-[#fbbf24] block mt-2 tracking-wide uppercase">
                                — Votação da Equipe & Gestão
                            </span>
                        </div>
                    </div>
                </div>

                {/* Meta de Faturamento da Empresa - 7 Cols */}
                <div className="lg:col-span-7 bg-white rounded-2xl p-7 border border-zinc-200/80 shadow-sm flex flex-col justify-between relative overflow-hidden">
                    <div>
                        {/* Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
                            <div className="flex items-center space-x-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#EE0AAE] to-[#fbbf24] text-white flex items-center justify-center shadow-md shrink-0">
                                    <FiDollarSign size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-zinc-900 tracking-tight">Meta de Faturamento da Empresa</h3>
                                    <p className="text-xs text-zinc-500 font-medium">Performance Financeira do Q3 • Setembro 2026</p>
                                </div>
                            </div>

                            <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs px-3 py-1.5 rounded-full">
                                <FiTrendingUp size={14} />
                                <span>+18.4% vs mês anterior</span>
                            </div>
                        </div>

                        {/* Values Display */}
                        <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200/60 mb-6">
                            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                                <div>
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Faturamento Realizado</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">R$ 418.650,00</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block mb-1">Meta Mensal</span>
                                    <span className="text-lg font-bold text-zinc-700">R$ 500.000,00</span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="mt-4">
                                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                                    <span className="text-[#EE0AAE] flex items-center gap-1">
                                        <FiTarget size={13} />
                                        <span>83,7% da meta alcançada</span>
                                    </span>
                                    <span className="text-zinc-500">Faltam R$ 81.350,00</span>
                                </div>
                                <div className="w-full h-4 bg-zinc-200 rounded-full overflow-hidden p-0.5 border border-zinc-300/60 shadow-inner">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-[#EE0AAE] via-[#f00a98] to-[#fbbf24] shadow-sm transition-all duration-1000"
                                        style={{ width: "83.7%" }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Mini Supporting Metrics Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3.5">
                                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide block mb-1">Ticket Médio</span>
                                <span className="text-lg font-bold text-zinc-900 block">R$ 14.950,00</span>
                                <span className="text-[10px] font-semibold text-emerald-600 mt-0.5 block">+5.2% este mês</span>
                            </div>

                            <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3.5">
                                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide block mb-1">Contratos Ativos</span>
                                <span className="text-lg font-bold text-zinc-900 block">28 Clientes</span>
                                <span className="text-[10px] font-semibold text-zinc-500 mt-0.5 block">100% retenção no Q3</span>
                            </div>

                            <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3.5">
                                <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide block mb-1">Projeção de Fechamento</span>
                                <span className="text-lg font-bold text-emerald-700 block">R$ 520.000,00</span>
                                <span className="text-[10px] font-semibold text-emerald-600 mt-0.5 block">104% (Superavit previsto)</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer link to BI */}
                    <div className="mt-6 pt-4 border-t border-zinc-100 flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Dados integrados em tempo real com o pipeline do Power BI</span>
                        <Link
                            href="/projetos"
                            className="text-xs font-bold text-[#EE0AAE] hover:underline flex items-center gap-1.5"
                        >
                            <span>Ver Relatórios Analíticos</span>
                            <FiArrowRight size={13} />
                        </Link>
                    </div>
                </div>

            </div>

            {/* Atividades Recentes do Time */}
            <div className="bg-white rounded-2xl p-7 border border-zinc-200/80 shadow-sm mt-8">
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-pink-50 text-[#EE0AAE] flex items-center justify-center">
                            <FiActivity size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-zinc-900 text-base">Atividades Recentes do Time</h3>
                            <p className="text-xs text-zinc-500">Últimas movimentações em projetos, kanbans e squads</p>
                        </div>
                    </div>
                    <Link
                        href="/projetos"
                        className="text-xs font-bold text-[#EE0AAE] hover:underline flex items-center gap-1"
                    >
                        <span>Explorar Projetos</span>
                        <FiArrowUpRight size={14} />
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3.5 flex items-start space-x-3">
                        <img src="/Avatar2.svg" alt="Camila" className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-xs text-zinc-800 font-medium leading-snug">
                                <span className="font-bold text-zinc-900">Camila Duarte</span> concluiu a tarefa <span className="font-semibold text-indigo-700">Autenticação OAuth2</span>
                            </p>
                            <span className="text-[10px] text-zinc-400 mt-1 block">Há 18 minutos</span>
                        </div>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3.5 flex items-start space-x-3">
                        <img src="/Avatar3.svg" alt="Lucas" className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-xs text-zinc-800 font-medium leading-snug">
                                <span className="font-bold text-zinc-900">Lucas Ferreira</span> moveu tarefa para <span className="font-semibold text-amber-700">Em Progresso</span>
                            </p>
                            <span className="text-[10px] text-zinc-400 mt-1 block">Há 42 minutos</span>
                        </div>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3.5 flex items-start space-x-3">
                        <img src="/Avatar3.svg" alt="Gabriel" className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-xs text-zinc-800 font-medium leading-snug">
                                <span className="font-bold text-zinc-900">Gabriel Costa</span> atualizou schema no <span className="font-semibold text-emerald-700">Power BI Analytics</span>
                            </p>
                            <span className="text-[10px] text-zinc-400 mt-1 block">Há 2 horas</span>
                        </div>
                    </div>

                    <div className="bg-zinc-50 border border-zinc-200/60 rounded-xl p-3.5 flex items-start space-x-3">
                        <img src="/Avatar1.svg" alt="Rafael" className="w-8 h-8 rounded-full shrink-0 mt-0.5" />
                        <div className="min-w-0">
                            <p className="text-xs text-zinc-800 font-medium leading-snug">
                                <span className="font-bold text-zinc-900">Rafael Oliveira</span> publicou pauta da <span className="font-semibold text-purple-700">Sprint Review Q3</span>
                            </p>
                            <span className="text-[10px] text-zinc-400 mt-1 block">Há 3 horas</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Notificações */}
            <NotificationsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                userId={userId}
                onUnreadCountChange={(count) => setUnreadCount(count)}
            />
        </div>
    );
}
