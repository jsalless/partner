"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiUsers,
  FiFolder,
  FiTrash2,
  FiSearch,
  FiBold,
  FiItalic,
  FiCode,
  FiList,
  FiCheckCircle,
  FiAlertTriangle,
  FiTrendingUp,
  FiLock,
  FiGlobe,
  FiPlus,
  FiX,
  FiHash,
  FiUserPlus,
  FiLogOut,
  FiShield,
} from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import { IoSend } from "react-icons/io5";
import { toast } from "react-toastify";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TeamMember {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
}

interface TeamProject {
  id: string;
  name: string;
  description?: string | null;
}

interface TeamDetail {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  owner?: TeamMember | null;
  project_id?: string | null;
  project?: TeamProject | null;
  is_private?: boolean;
  avatar_url?: string | null;
  members: TeamMember[];
}

interface ChatMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  channel: string;
  created_at?: string | null;
  sender?: TeamMember | null;
  reactions?: Record<string, number>;
}

export interface TeamChannel {
  id: string;
  name: string;
  description?: string | null;
  is_default?: boolean;
}

const EMOJI_OPTIONS = ["👍", "🚀", "❤️", "👀", "🔥", "👏", "💡", "✅"];

export default function TeamChatPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<TeamDetail | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [channels, setChannels] = useState<TeamChannel[]>([]);
  const [currentChannel, setCurrentChannel] = useState("geral");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserData, setCurrentUserData] = useState<TeamMember | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [localReactions, setLocalReactions] = useState<Record<string, Record<string, number>>>({});

  // Estado para modal de novo canal
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelDescription, setNewChannelDescription] = useState("");
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Estados para modal de adicionar integrante
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<TeamMember[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);

  // Estados para sair da equipe
  const [isLeaveTeamModalOpen, setIsLeaveTeamModalOpen] = useState(false);
  const [leavingTeam, setLeavingTeam] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Headers de autenticação
  const getAuthHeader = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token =
      localStorage.getItem("partner_token") || sessionStorage.getItem("partner_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Carrega usuário atual salvo
  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr =
        localStorage.getItem("partner_user") || sessionStorage.getItem("partner_user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u?.id) {
            setCurrentUserId(u.id);
            setCurrentUserData({
              id: u.id,
              email: u.email || "",
              first_name: u.first_name || u.firstName || "",
              last_name: u.last_name || u.lastName || "",
              full_name: u.full_name || `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
              role: u.role || "dev",
              avatar_url: u.avatar_url || u.avatarUrl || u.default_avatar || "/Avatar1.svg",
            });
          }
        } catch (e) {
          console.error("Erro ao ler usuário salvo:", e);
        }
      }
    }
  }, []);

  // Carrega dados da equipe
  useEffect(() => {
    if (!teamId) return;

    const fetchTeam = async () => {
      setLoadingTeam(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
          headers: { ...getAuthHeader() },
        });
        if (!res.ok) {
          throw new Error("Equipe não encontrada ou você não tem acesso.");
        }
        const data = await res.json();
        setTeam(data);
      } catch (err: any) {
        toast.error(err.message || "Erro ao carregar dados da equipe.");
        router.push("/equipes");
      } finally {
        setLoadingTeam(false);
      }
    };

    fetchTeam();
  }, [teamId, router]);

  // Carrega canais da equipe
  const fetchChannels = async () => {
    if (!teamId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/channels`, {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const data: TeamChannel[] = await res.json();
        setChannels(data);
        if (data.length > 0 && !data.some((c) => c.name === currentChannel)) {
          setCurrentChannel(data[0].name);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar canais:", err);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, [teamId]);

  // Criação de novo canal
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newChannelName.trim().toLowerCase().replace("#", "").replace(/\s+/g, "-");
    if (!clean || creatingChannel || !teamId) return;

    setCreatingChannel(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          name: clean,
          description: newChannelDescription.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erro ao criar canal.");
      }

      const created: TeamChannel = await res.json();
      setChannels((prev) => [...prev, created]);
      setCurrentChannel(created.name);
      setIsChannelModalOpen(false);
      setNewChannelName("");
      setNewChannelDescription("");
      toast.success(`Canal #${created.name} criado com sucesso!`);
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar canal.");
    } finally {
      setCreatingChannel(false);
    }
  };

  // Carrega todos os usuários para o modal de adicionar integrantes
  const fetchAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/users`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setAllUsers(data);
      }
    } catch (err) {
      console.error("Erro ao carregar usuários:", err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Adiciona integrante à equipe
  const handleAddMember = async (userIdToAdd: string) => {
    if (!teamId || !userIdToAdd) return;
    setAddingMemberId(userIdToAdd);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ user_id: userIdToAdd }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao adicionar integrante.");
      }

      const updatedTeam = await res.json();
      setTeam(updatedTeam);
      toast.success("Integrante adicionado à equipe com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Falha ao adicionar integrante.");
    } finally {
      setAddingMemberId(null);
    }
  };

  // Remove integrante da equipe
  const handleRemoveMember = async (userIdToRemove: string) => {
    if (!teamId || !userIdToRemove) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members/${userIdToRemove}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const updatedTeam = await res.json();
        setTeam(updatedTeam);
        toast.info("Integrante removido da equipe.");
      }
    } catch (err) {
      console.error("Erro ao remover integrante:", err);
    }
  };

  // Usuário sai da equipe
  const handleLeaveTeam = async () => {
    if (!teamId || !currentUserId) return;
    if (isOwner) {
      toast.warning("Você é o Tech Lead da equipe e não pode sair diretamente.");
      return;
    }

    setLeavingTeam(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/members/${currentUserId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao sair da equipe.");
      }

      toast.success("Você saiu da equipe com sucesso.");
      setIsLeaveTeamModalOpen(false);
      router.push("/equipes");
    } catch (err: any) {
      toast.error(err.message || "Falha ao sair da equipe.");
    } finally {
      setLeavingTeam(false);
    }
  };

  // Carrega mensagens do canal ativo
  const fetchMessages = async (silent = false) => {
    if (!teamId) return;
    if (!silent) setLoadingMessages(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/teams/${teamId}/messages?channel=${currentChannel}&limit=100`,
        {
          headers: { ...getAuthHeader() },
        }
      );
      if (res.ok) {
        const data: ChatMessage[] = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error("Erro ao buscar mensagens:", err);
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Carrega ao trocar de canal
  useEffect(() => {
    fetchMessages(false);
  }, [teamId, currentChannel]);

  // Polling automático estilo Slack a cada 3.5 segundos
  useEffect(() => {
    if (!teamId) return;
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 3500);
    return () => clearInterval(interval);
  }, [teamId, currentChannel]);

  // Auto scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Enviar Mensagem
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanContent = inputText.trim();
    if (!cleanContent || sending || !teamId) return;

    setSending(true);

    // Otimista: renderização imediata na UI
    const tempId = "temp-" + Date.now();
    const optimisticMessage: ChatMessage = {
      id: tempId,
      team_id: teamId,
      user_id: currentUserId || "eu",
      content: cleanContent,
      type: "chat",
      channel: currentChannel,
      created_at: new Date().toISOString(),
      sender: currentUserData || {
        id: currentUserId || "eu",
        email: "voce@partner.local",
        full_name: "Você",
        avatar_url: "/Avatar1.svg",
      },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText("");

    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          content: cleanContent,
          type: "chat",
          channel: currentChannel,
          user_id: currentUserId,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Erro ao enviar mensagem.");
      }

      const created: ChatMessage = await res.json();
      // Substitui a mensagem temporária pela real do banco
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? created : msg))
      );
    } catch (err: any) {
      toast.error(err.message || "Não foi possível enviar a mensagem.");
      // Remove a otimista em caso de erro
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      setInputText(cleanContent);
    } finally {
      setSending(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Excluir mensagem
  const handleDeleteMessage = async (msgId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta mensagem?")) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/teams/${teamId}/messages/${msgId}?user_id=${currentUserId || ""}`,
        {
          method: "DELETE",
          headers: { ...getAuthHeader() },
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Erro ao excluir mensagem.");
      }

      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast.success("Mensagem removida.");
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir mensagem.");
    }
  };

  // Reação emoji local / feedback interativo
  const handleToggleReaction = (msgId: string, emoji: string) => {
    setLocalReactions((prev) => {
      const currentMsgReactions = prev[msgId] || {};
      const currentCount = currentMsgReactions[emoji] || 0;
      return {
        ...prev,
        [msgId]: {
          ...currentMsgReactions,
          [emoji]: currentCount > 0 ? currentCount - 1 : 1,
        },
      };
    });
  };

  // Atalhos de teclado no textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Formatação rápida de texto
  const insertFormat = (prefix: string, suffix: string = "") => {
    if (!textareaRef.current) return;
    const { selectionStart, selectionEnd, value } = textareaRef.current;
    const selected = value.substring(selectionStart, selectionEnd);
    const replacement = `${prefix}${selected || "texto"}${suffix}`;
    const newText =
      value.substring(0, selectionStart) +
      replacement +
      value.substring(selectionEnd);
    setInputText(newText);
  };

  // Filtro de mensagens por busca
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.content.toLowerCase().includes(q) ||
        m.sender?.full_name?.toLowerCase().includes(q) ||
        m.sender?.first_name?.toLowerCase().includes(q)
    );
  }, [messages, searchQuery]);

  // Filtro de usuários para adicionar na equipe
  const filteredUsers = useMemo(() => {
    if (!memberSearchQuery.trim()) return allUsers;
    const q = memberSearchQuery.toLowerCase();
    return allUsers.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.first_name?.toLowerCase().includes(q) ||
        u.last_name?.toLowerCase().includes(q)
    );
  }, [allUsers, memberSearchQuery]);

  // Identifica se o usuário atual é o Dono da Equipe
  const isOwner = Boolean(currentUserId && team?.owner_id && currentUserId === team.owner_id);


  const activeChannelObj = channels.find((c) => c.name === currentChannel) || {
    id: "geral",
    name: currentChannel || "geral",
    description: "Canal geral de comunicação da equipe",
  };

  // Helper de horário
  const formatTime = (isoString?: string | null) => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const formatDateLabel = (isoString?: string | null) => {
    if (!isoString) return "Hoje";
    try {
      const date = new Date(isoString);
      const today = new Date();
      if (date.toDateString() === today.toDateString()) return "Hoje";
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) return "Ontem";
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return "Hoje";
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#121214] text-gray-100 overflow-hidden select-none font-sans">
      {/* 1. SLACK WORKSPACE SIDEBAR (Canais e Integrantes) */}
      <aside className="w-72 bg-[#18181b] border-r border-zinc-800 flex flex-col shrink-0">
        {/* Topo da Sidebar: Identificação da Equipe */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/40">
          <div className="flex items-center justify-between mb-2">
            <Link
              href="/equipes"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors bg-zinc-800/60 hover:bg-zinc-800 px-2.5 py-1.5 rounded-lg"
              title="Voltar para a página de equipes"
            >
              <FiArrowLeft size={13} />
              <span>Voltar às equipes</span>
            </Link>

            {team?.is_private ? (
              <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-800/50">
                <FiLock size={10} /> Privada
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-800/50">
                <FiGlobe size={10} /> Pública
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 mt-2">
            {team?.avatar_url ? (
              <img
                src={team.avatar_url}
                alt={team.name}
                className="w-10 h-10 rounded-xl object-cover border border-zinc-700 shadow-md shadow-[#F14343]/20 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#F14343] to-[#f00a98] flex items-center justify-center font-bold text-lg text-white shadow-md shadow-[#F14343]/20 shrink-0">
                {team?.name ? team.name.slice(0, 2).toUpperCase() : "EQ"}
              </div>
            )}
            <div className="overflow-hidden">
              <h2 className="font-bold text-white text-base truncate leading-tight">
                {team?.name || "Carregando equipe..."}
              </h2>
              {team?.project && (
                <div className="flex items-center gap-1 text-xs text-[#F14343] font-medium mt-0.5 truncate">
                  <FiFolder size={11} className="shrink-0" />
                  <span className="truncate">{team.project.name}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lista de Canais (Estilo Slack) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <div className="px-2 mb-2 flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <span>Canais ({channels.length})</span>
              <button
                type="button"
                onClick={() => setIsChannelModalOpen(true)}
                className="px-2 py-0.5 rounded-lg bg-zinc-800/80 hover:bg-[#F14343] text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                title="Adicionar novo canal"
              >
                <FiPlus size={13} />
                <span className="text-[11px] font-bold">Novo</span>
              </button>
            </div>

            <div className="space-y-1">
              {channels.map((channel) => {
                const isActive = currentChannel === channel.name;
                return (
                  <button
                    key={channel.id}
                    type="button"
                    onClick={() => setCurrentChannel(channel.name)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 text-left cursor-pointer ${isActive
                        ? "bg-[#F14343] text-white font-semibold shadow-md shadow-[#F14343]/20"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800/70"
                      }`}
                  >
                    <span className="text-zinc-400 font-bold">#</span>
                    <span className="truncate">{channel.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Integrantes da Equipe */}
          <div>
            <div className="px-2 mb-2 flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              <span>Integrantes ({team?.members?.length || 1})</span>
              <button
                type="button"
                onClick={() => {
                  setIsMemberModalOpen(true);
                  fetchAllUsers();
                }}
                className="px-2 py-0.5 rounded-lg bg-zinc-800/80 hover:bg-[#F14343] text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer text-[11px] font-bold"
                title="Adicionar integrante"
              >
                <FiUserPlus size={12} />
                <span>Adicionar</span>
              </button>
            </div>

            <div className="space-y-1">
              {/* Dono / Tech Lead */}
              {team?.owner && (
                <div className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/50 text-xs text-zinc-200">
                  <div className="relative shrink-0">
                    <img
                      src={team.owner.avatar_url || "/Avatar1.svg"}
                      alt={team.owner.full_name || team.owner.email}
                      className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                    />
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-zinc-900" />
                  </div>
                  <div className="truncate flex-1">
                    <div className="font-semibold text-white flex items-center gap-1 truncate">
                      <span>{team.owner.full_name || team.owner.email}</span>
                      <FaCrown size={11} className="text-[#F14343] shrink-0" title="Tech Lead" />
                    </div>
                    <span className="text-[10px] text-amber-400 font-semibold">Tech Lead</span>
                  </div>
                </div>
              )}

              {/* Demais Membros */}
              {team?.members
                ?.filter((m) => m.id !== team.owner_id)
                ?.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-zinc-800/50 text-xs text-zinc-200"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={member.avatar_url || "/Avatar1.svg"}
                        alt={member.full_name || member.email}
                        className="w-7 h-7 rounded-full object-cover border border-zinc-700"
                      />
                      <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-zinc-900" />
                    </div>
                    <div className="truncate flex-1">
                      <div className="font-medium text-white truncate">
                        {member.full_name || member.email}
                      </div>
                      <span className="text-[10px] text-zinc-400">
                        {member.role || "dev"}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Rodapé da Sidebar: Usuário Atual */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/60 flex items-center gap-3">
          <div className="relative shrink-0">
            <img
              src={currentUserData?.avatar_url || "/Avatar1.svg"}
              alt="Seu avatar"
              className="w-9 h-9 rounded-full object-cover border border-zinc-700"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-900" />
          </div>
          <div className="truncate flex-1">
            <div className="font-semibold text-white text-xs truncate">
              {currentUserData?.full_name || "Você"}
            </div>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Conectado no Partner</span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. ÁREA CENTRAL DO CHAT (Estilo Slack) */}
      <main className="flex-1 flex flex-col h-full bg-[#1e1e24] overflow-hidden">
        {/* Header do Canal */}
        <header className="h-16 px-6 border-b border-zinc-800/90 bg-zinc-900/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="text-xl font-bold text-white flex items-center gap-1.5">
              <span className="text-[#F14343] font-bold">#</span>
              <span>{activeChannelObj.name}</span>
            </div>
            <div className="hidden md:block h-4 w-px bg-zinc-700" />
            <p className="hidden md:block text-xs text-zinc-400 max-w-xl truncate">
              {activeChannelObj.description || `Canal #${activeChannelObj.name}`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Barra de Busca de Mensagens */}
            <div className="relative hidden sm:block">
              <FiSearch
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar no canal..."
                className="w-48 lg:w-64 pl-8 pr-3 py-1.5 rounded-xl bg-zinc-800/80 text-xs text-white placeholder-zinc-400 border border-zinc-700/60 focus:outline-none focus:border-[#F14343] transition-all"
              />
            </div>

            {/* Botão Adicionar Integrante */}
            <button
              type="button"
              onClick={() => {
                setIsMemberModalOpen(true);
                fetchAllUsers();
              }}
              className="flex items-center gap-1.5 bg-[#F14343]/15 hover:bg-[#F14343] text-[#F14343] hover:text-white border border-[#F14343]/30 hover:border-[#F14343] px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title="Adicionar novo integrante à equipe"
            >
              <FiUserPlus size={13} />
              <span className="hidden sm:inline">Adicionar integrante</span>
            </button>

            {/* Botão Sair da Equipe */}
            <button
              type="button"
              onClick={() => {
                if (isOwner) {
                  toast.warning("Você é o Tech Lead da equipe e não pode sair diretamente.");
                } else {
                  setIsLeaveTeamModalOpen(true);
                }
              }}
              className="flex items-center gap-1.5 bg-zinc-800/80 hover:bg-red-600/20 text-zinc-300 hover:text-red-400 border border-zinc-700/60 hover:border-red-500/40 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs"
              title={isOwner ? "Tech Lead da equipe não pode sair diretamente" : "Sair da equipe"}
            >
              <FiLogOut size={13} />
              <span className="hidden lg:inline">Sair da equipe</span>
            </button>

            {/* Contador de Membros */}
            <div className="flex items-center gap-1.5 bg-zinc-800/80 px-3 py-1.5 rounded-xl border border-zinc-700/60 text-xs text-zinc-300">
              <FiUsers size={13} className="text-[#F14343]" />
              <span className="font-semibold">{team?.members?.length || 1}</span>
            </div>
          </div>
        </header>

        {/* FEED DE MENSAGENS */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Boas-vindas ao canal */}
          <div className="pb-6 border-b border-zinc-800/60">
            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-2xl mb-3 border border-zinc-700/50">
              <FiHash className="text-[#F14343]" size={24} />
            </div>
            <h1 className="text-xl font-bold text-white">
              Boas-vindas ao canal #{activeChannelObj.name}!
            </h1>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              {activeChannelObj.description || "Este é o espaço oficial da equipe para trocar mensagens sobre este assunto."}
            </p>
          </div>

          {loadingMessages ? (
            <div className="flex items-center justify-center py-12 text-zinc-400 text-sm gap-2">
              <div className="w-5 h-5 border-2 border-[#F14343] border-t-transparent rounded-full animate-spin" />
              <span>Sincronizando mensagens com a equipe...</span>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800/60 flex items-center justify-center text-3xl mx-auto mb-3">
                💬
              </div>
              <h3 className="text-white font-semibold text-base">
                Nenhuma mensagem enviada neste canal ainda.
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Envie a primeira mensagem abaixo para iniciar a conversa com a equipe!
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMe = msg.user_id === currentUserId;
              const senderName =
                msg.sender?.full_name ||
                msg.sender?.first_name ||
                msg.sender?.email ||
                "Integrante";
              const isOwner = msg.user_id === team?.owner_id;
              const msgReactions = localReactions[msg.id] || {};

              return (
                <div
                  key={msg.id}
                  className="group relative flex items-start gap-3.5 p-3 rounded-2xl transition-all duration-150 hover:bg-zinc-800/40 border border-transparent"
                >
                  {/* Avatar do Autor */}
                  <div className="shrink-0 mt-0.5">
                    <img
                      src={msg.sender?.avatar_url || "/Avatar1.svg"}
                      alt={senderName}
                      className="w-10 h-10 rounded-xl object-cover border border-zinc-700/80 shadow-sm"
                    />
                  </div>

                  {/* Conteúdo da Mensagem */}
                  <div className="flex-1 min-w-0">
                    {/* Header da Mensagem (Nome, Cargo, Data) */}
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-white text-sm hover:underline cursor-pointer">
                        {senderName}
                      </span>

                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#F14343]/20 text-[#F14343] border border-[#F14343]/30">
                          <FaCrown size={9} /> Tech Lead
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                          {msg.sender?.role || "dev"}
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-400 ml-auto sm:ml-0">
                        {formatDateLabel(msg.created_at)} às {formatTime(msg.created_at)}
                      </span>
                    </div>

                    {/* Texto da Mensagem com suporte a quebras de linha */}
                    <div className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>

                    {/* Barra de Reações / Badges de Emojis */}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {Object.entries(msgReactions).map(([emoji, count]) => {
                        if (count <= 0) return null;
                        return (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(msg.id, emoji)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-800 text-xs text-zinc-300 border border-zinc-700 hover:border-zinc-500 transition-all cursor-pointer"
                          >
                            <span>{emoji}</span>
                            <span className="font-semibold text-[11px]">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Barra de Ações Rápidas Flutuante (Estilo Slack) */}
                  <div className="absolute right-3 -top-3 hidden group-hover:flex items-center gap-1 bg-zinc-900 border border-zinc-700 rounded-xl px-2 py-1 shadow-xl z-10">
                    {/* Botões de Reação Rápida */}
                    {["👍", "🚀", "❤️", "👀"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        className="p-1 hover:bg-zinc-800 rounded text-sm transition-transform active:scale-125 cursor-pointer"
                        title={`Reagir com ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}

                    {/* Botão de Excluir (apenas autor ou dono) */}
                    {(isMe || currentUserId === team?.owner_id) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 rounded transition-colors cursor-pointer"
                        title="Excluir mensagem"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 3. SLACK MESSAGE COMPOSER (Barra Rica de Envio) */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/70">
          <form
            onSubmit={handleSendMessage}
            className="rounded-2xl border border-zinc-700/80 bg-[#16161a] focus-within:border-[#F14343] transition-all duration-200 overflow-hidden shadow-lg"
          >
            {/* Barra Superior de Formatação Rápida */}
            <div className="px-3 py-2 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/40">
              <span className="text-xs font-semibold text-zinc-400">
                Conversando em #{activeChannelObj.name}
              </span>

              {/* Botões de Formatação Rápida */}
              <div className="flex items-center gap-1 text-zinc-400">
                <button
                  type="button"
                  onClick={() => insertFormat("**", "**")}
                  className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Negrito (**texto**)"
                >
                  <FiBold size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat("*", "*")}
                  className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Itálico (*texto*)"
                >
                  <FiItalic size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat("`", "`")}
                  className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Código (`código`)"
                >
                  <FiCode size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat("\n- ")}
                  className="p-1.5 hover:bg-zinc-800 hover:text-white rounded-lg transition-colors cursor-pointer"
                  title="Lista (- item)"
                >
                  <FiList size={14} />
                </button>
              </div>
            </div>

            {/* Caixa de Texto Multilinha */}
            <div className="p-3">
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                placeholder={`Conversar em #${activeChannelObj.name}... (Pressione Enter para enviar, Shift+Enter para quebrar linha)`}
                className="w-full bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Barra Inferior com Emojis Rápidos e Botão Enviar */}
            <div className="px-3 py-2 border-t border-zinc-800/60 flex items-center justify-between bg-zinc-900/30">
              <div className="flex items-center gap-1.5 flex-wrap">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setInputText((prev) => prev + emoji)}
                    className="p-1 hover:bg-zinc-800 rounded text-sm transition-transform active:scale-125 cursor-pointer"
                    title={`Inserir ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!inputText.trim() || sending}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#F14343] to-[#f00a98] hover:opacity-95 active:scale-95 text-white font-bold text-xs tracking-wide shadow-md shadow-[#F14343]/20 transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <IoSend size={13} />
                <span>{sending ? "Enviando..." : "Enviar"}</span>
              </button>
            </div>
          </form>
        </div>
      </main>
      {/* Modal Adicionar Novo Canal */}
      {isChannelModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setIsChannelModalOpen(false)}
        >
          <div
            className="bg-[#18181b] border border-zinc-800 w-full max-w-md rounded-2xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span className="text-[#F14343] font-bold text-lg">#</span>
                <span>Criar Novo Canal</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsChannelModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nome do Canal <strong className="text-[#F14343]">*</strong>
                </label>
                <div className="flex items-center bg-[#121214] border border-zinc-700/80 rounded-xl px-3 focus-within:border-[#F14343] transition-colors">
                  <span className="text-zinc-500 font-bold mr-1.5">#</span>
                  <input
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="ex: avisos, design, reunioes"
                    required
                    maxLength={50}
                    className="w-full py-2.5 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Use letras minúsculas, números e hífens.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Descrição (opcional)
                </label>
                <input
                  type="text"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  placeholder="Qual é o objetivo deste canal?"
                  maxLength={200}
                  className="w-full px-3 py-2.5 bg-[#121214] border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-[#F14343] transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsChannelModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                  disabled={creatingChannel}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newChannelName.trim() || creatingChannel}
                  className="px-4 py-2 rounded-xl bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white font-bold text-xs shadow-md shadow-[#F14343]/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  {creatingChannel ? "Criando..." : "Criar Canal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL DE ADICIONAR INTEGRANTES */}
      {isMemberModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsMemberModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#18181b] border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F14343]/15 text-[#F14343] flex items-center justify-center border border-[#F14343]/30">
                  <FiUserPlus size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Adicionar Integrantes
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Equipe: <span className="text-zinc-200 font-medium">{team?.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Fechar (ESC)"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Campo de Busca */}
            <div className="my-4">
              <div className="relative">
                <FiSearch
                  size={14}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou e-mail..."
                  className="w-full pl-9 pr-4 py-2.5 bg-[#121214] border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#F14343] transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Lista de Usuários */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-zinc-800/40">
              {loadingUsers ? (
                <div className="py-12 flex flex-col items-center justify-center text-zinc-400 text-xs gap-2">
                  <div className="w-6 h-6 border-2 border-[#F14343] border-t-transparent rounded-full animate-spin" />
                  <span>Carregando usuários cadastrados...</span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-12 text-center text-zinc-500 text-xs">
                  Nenhum usuário encontrado para "{memberSearchQuery}".
                </div>
              ) : (
                filteredUsers.map((user) => {
                  const isOwner = user.id === team?.owner_id;
                  const isMember = team?.members?.some((m) => m.id === user.id);
                  const isAdding = addingMemberId === user.id;

                  return (
                    <div
                      key={user.id}
                      className="pt-2 flex items-center justify-between gap-3 p-2 rounded-xl hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <img
                          src={user.avatar_url || "/Avatar1.svg"}
                          alt={user.full_name || user.email}
                          className="w-9 h-9 rounded-full object-cover border border-zinc-700 shrink-0"
                        />
                        <div className="truncate">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-xs font-semibold text-white truncate">
                              {user.full_name || `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email}
                            </span>
                            {isOwner ? (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F14343]/20 text-[#F14343] border border-[#F14343]/30 flex items-center gap-0.5 shrink-0">
                                <FaCrown size={9} /> Tech Lead
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50 shrink-0">
                                {user.role || "dev"}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isOwner ? (
                          <span className="text-xs text-amber-400 font-semibold px-2 py-1">
                            Tech Lead
                          </span>
                        ) : isMember ? (
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <FiCheckCircle size={12} />
                            <span>Na equipe</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddMember(user.id)}
                            disabled={isAdding}
                            className="flex items-center gap-1 bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white font-semibold text-xs px-3 py-1.5 rounded-lg shadow-md shadow-[#F14343]/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isAdding ? (
                              <>
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Adicionando...</span>
                              </>
                            ) : (
                              <>
                                <FiPlus size={13} />
                                <span>Adicionar</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 mt-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
              <span>{team?.members?.length || 1} integrante(s) atualmente</span>
              <button
                type="button"
                onClick={() => setIsMemberModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DE CONFIRMAÇÃO PARA SAIR DA EQUIPE */}
      {isLeaveTeamModalOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsLeaveTeamModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-[#18181b] border border-red-500/40 rounded-2xl shadow-2xl p-6 text-zinc-100 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-600/15 text-red-400 border border-red-500/30 flex items-center justify-center mb-4">
              <FiLogOut size={22} />
            </div>

            <h3 className="text-base font-bold text-white mb-2">
              Sair da Equipe {team?.name}?
            </h3>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Ao sair desta equipe, você não terá mais acesso às mensagens trocadas no chat, canais ou atualizações do projeto.
            </p>
            <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs text-zinc-400 mb-6">
              Para retornar futuramente, o Tech Lead da equipe precisará adicioná-lo novamente.
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsLeaveTeamModalOpen(false)}
                disabled={leavingTeam}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleLeaveTeam}
                disabled={leavingTeam}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {leavingTeam ? "Saindo..." : "Sim, Sair da Equipe"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
