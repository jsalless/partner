"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
    FiBell,
    FiCheck,
    FiCheckCircle,
    FiTrash2,
    FiX,
    FiExternalLink,
    FiMessageSquare
} from "react-icons/fi";
import { IoCheckmarkDoneOutline } from "react-icons/io5";
import { toast } from "react-toastify";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface NotificationItem {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    link?: string | null;
    read: boolean;
    created_at: string;
}

interface NotificationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    onUnreadCountChange?: (count: number) => void;
}

function formatRelativeTime(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHours = Math.floor(diffMin / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSec < 60) return "Agora mesmo";
        if (diffMin < 60) return `Há ${diffMin} min`;
        if (diffHours < 24) return `Há ${diffHours}h`;
        if (diffDays === 1) return "Ontem";
        if (diffDays < 7) return `Há ${diffDays}d`;
        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch {
        return "";
    }
}

export function NotificationsModal({
    isOpen,
    onClose,
    userId,
    onUnreadCountChange
}: NotificationsModalProps) {
    const router = useRouter();
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState<"all" | "unread">("all");
    const [isPending, startTransition] = useTransition();

    const getAuthHeaders = (): Record<string, string> => {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("partner_token") || sessionStorage.getItem("partner_token");
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
        }
        return headers;
    };

    const fetchNotifications = async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications?user_id=${userId}&limit=50`, {
                headers: getAuthHeaders()
            });
            if (res.ok) {
                const data: NotificationItem[] = await res.json();
                setNotifications(data);
                const unread = data.filter((n) => !n.read).length;
                onUnreadCountChange?.(unread);
            }
        } catch (err) {
            console.error("Erro ao carregar notificações:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && userId) {
            fetchNotifications();
        }
    }, [isOpen, userId]);

    // Fechar ao pressionar ESC
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const unreadTotal = notifications.filter((n) => !n.read).length;

    const handleMarkAsRead = async (notification: NotificationItem, navigate: boolean = true) => {
        if (!notification.read) {
            // Atualização otimista
            setNotifications((prev) =>
                prev.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
            );
            const newUnread = Math.max(0, unreadTotal - 1);
            onUnreadCountChange?.(newUnread);

            try {
                await fetch(`${API_BASE_URL}/api/notifications/${notification.id}/read`, {
                    method: "PATCH",
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ read: true })
                });
            } catch (err) {
                console.error("Erro ao marcar notificação como lida:", err);
            }
        }

        if (navigate && notification.link) {
            onClose();
            router.push(notification.link);
        }
    };

    const handleMarkAllAsRead = async () => {
        if (unreadTotal === 0) return;

        // Atualização otimista
        setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
        onUnreadCountChange?.(0);

        try {
            const res = await fetch(`${API_BASE_URL}/api/notifications/read-all?user_id=${userId}`, {
                method: "PATCH",
                headers: getAuthHeaders()
            });
            if (res.ok) {
                toast.success("Todas as notificações foram marcadas como lidas.");
            }
        } catch (err) {
            console.error("Erro ao marcar todas como lidas:", err);
            toast.error("Não foi possível atualizar as notificações.");
        }
    };

    const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
        e.stopPropagation();

        const itemToDelete = notifications.find((n) => n.id === notificationId);
        const wasUnread = itemToDelete && !itemToDelete.read;

        // Otimista
        setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
        if (wasUnread) {
            onUnreadCountChange?.(Math.max(0, unreadTotal - 1));
        }

        try {
            await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });
        } catch (err) {
            console.error("Erro ao remover notificação:", err);
        }
    };

    const filteredNotifications = notifications.filter((n) => {
        if (filter === "unread") return !n.read;
        return true;
    });

    return (
        <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-end p-4 sm:p-6 md:p-8 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200/90 overflow-hidden flex flex-col max-h-[85vh] transition-all transform animate-in slide-in-from-top-4 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/70">
                    <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20">
                            <FiBell className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h2 className="text-base font-bold text-zinc-900">Notificações</h2>
                                {unreadTotal > 0 && (
                                    <span className="px-2 py-0.5 text-xs font-bold bg-amber-500 text-black rounded-full shadow-xs">
                                        {unreadTotal} nova{unreadTotal > 1 ? "s" : ""}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-zinc-500">Atualizações de equipes e projetos</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/60 transition-colors flex items-center justify-center cursor-pointer"
                        title="Fechar (ESC)"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Subheader / Filtros & Ações */}
                <div className="px-4 py-2.5 bg-white border-b border-zinc-100 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1.5">
                        <button
                            onClick={() => setFilter("all")}
                            className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                filter === "all"
                                    ? "bg-zinc-900 text-white"
                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                        >
                            Todas ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter("unread")}
                            className={`px-3 py-1 rounded-full font-medium transition-colors cursor-pointer ${
                                filter === "unread"
                                    ? "bg-amber-500 text-black font-semibold"
                                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
                            }`}
                        >
                            Não lidas ({unreadTotal})
                        </button>
                    </div>

                    {unreadTotal > 0 && (
                        <button
                            onClick={handleMarkAllAsRead}
                            className="flex items-center space-x-1 text-xs text-amber-700 hover:text-amber-800 font-semibold cursor-pointer transition-colors"
                            title="Marcar todas como lidas"
                        >
                            <IoCheckmarkDoneOutline className="w-4 h-4" />
                            <span>Ler todas</span>
                        </button>
                    )}
                </div>

                {/* Lista de Notificações */}
                <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
                    {loading ? (
                        <div className="p-10 flex flex-col items-center justify-center space-y-3 text-zinc-400">
                            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs">Carregando notificações...</span>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                            <div className="w-14 h-14 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center">
                                <FiCheckCircle className="w-7 h-7" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-800">Tudo limpo por aqui!</h3>
                                <p className="text-xs text-zinc-500 max-w-[240px] mt-1">
                                    {filter === "unread"
                                        ? "Você não possui nenhuma notificação não lida."
                                        : "Você não recebeu nenhuma notificação recentemente."}
                                </p>
                            </div>
                        </div>
                    ) : (
                        filteredNotifications.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleMarkAsRead(item, true)}
                                className={`group relative p-4 transition-all cursor-pointer flex items-start space-x-3.5 hover:bg-zinc-50/90 ${
                                    !item.read ? "bg-amber-50/40 border-l-4 border-amber-500" : ""
                                }`}
                            >
                                {/* Ícone de categoria */}
                                <div
                                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                        !item.read
                                            ? "bg-amber-500/15 text-amber-700"
                                            : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200"
                                    }`}
                                >
                                    <FiMessageSquare className="w-4 h-4" />
                                </div>

                                {/* Conteúdo */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <h4
                                            className={`text-xs truncate ${
                                                !item.read
                                                    ? "font-bold text-zinc-900"
                                                    : "font-medium text-zinc-700"
                                            }`}
                                        >
                                            {item.title}
                                        </h4>
                                        <span className="text-[11px] text-zinc-400 shrink-0">
                                            {formatRelativeTime(item.created_at)}
                                        </span>
                                    </div>

                                    <p className="text-xs text-zinc-600 mt-1 line-clamp-2 leading-relaxed">
                                        {item.message}
                                    </p>

                                    {item.link && (
                                        <div className="flex items-center space-x-1 text-[11px] text-amber-700 font-medium mt-2">
                                            <span>Abrir no chat</span>
                                            <FiExternalLink className="w-3 h-3" />
                                        </div>
                                    )}
                                </div>

                                {/* Ações rápidas no hover */}
                                <div className="shrink-0 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {!item.read && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleMarkAsRead(item, false);
                                            }}
                                            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center cursor-pointer"
                                            title="Marcar como lida"
                                        >
                                            <FiCheck className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => handleDelete(e, item.id)}
                                        className="w-7 h-7 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center cursor-pointer"
                                        title="Remover notificação"
                                    >
                                        <FiTrash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 bg-zinc-50 border-t border-zinc-100 text-[11px] text-zinc-500 flex items-center justify-between">
                    <span>
                        Total: {notifications.length} notificaç{notifications.length === 1 ? "ão" : "ões"}
                    </span>
                    <button
                        onClick={onClose}
                        className="text-zinc-600 hover:text-zinc-900 font-medium cursor-pointer"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}
