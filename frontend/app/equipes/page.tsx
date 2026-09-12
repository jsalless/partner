"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { League_Gothic } from "next/font/google";
import { useState, useEffect, useMemo } from "react";
import { FiPlus, FiUsers, FiEdit2, FiTrash2, FiSearch, FiFolder, FiLock, FiGlobe, FiUserPlus, FiEye } from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import { toast } from "react-toastify";
import { TeamModal } from "@/components/teamModal";
import { IoChatboxEllipses } from "react-icons/io5";

const leagueGothic = League_Gothic({
  subsets: ["latin"],
  weight: ["400"],
});

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

interface Team {
  id: string;
  name: string;
  description?: string | null;
  owner_id: string;
  owner?: TeamMember | null;
  project_id?: string | null;
  project?: TeamProject | null;
  is_private?: boolean;
  avatar_url?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  members: TeamMember[];
}

export default function Equipes() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"minhas" | "explorar">("minhas");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal de criação / edição
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Usuário atual
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const getAuthHeader = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token =
      localStorage.getItem("partner_token") || sessionStorage.getItem("partner_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr =
        localStorage.getItem("partner_user") || sessionStorage.getItem("partner_user");
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          if (u?.id) setCurrentUserId(u.id);
        } catch (e) {
          console.error("Erro ao ler usuário salvo:", e);
        }
      }
    }
  }, []);

  const fetchTeams = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams`, {
        headers: {
          ...getAuthHeader(),
        },
      });
      if (!res.ok) {
        throw new Error("Não foi possível carregar as equipes.");
      }
      const data = await res.json();
      setTeams(data);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar equipes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingTeam(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (team: Team) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleSaveTeam = async (data: {
    name: string;
    description?: string;
    project_id: string;
    is_private: boolean;
    avatar_url?: string;
    member_ids: string[];
  }) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...getAuthHeader(),
    };

    if (editingTeam) {
      // Edição de equipe
      const res = await fetch(`${API_BASE_URL}/api/teams/${editingTeam.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          project_id: data.project_id,
          is_private: data.is_private,
          avatar_url: data.avatar_url,
          member_ids: data.member_ids,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.detail || "Erro ao editar equipe.";
        toast.error(msg);
        throw new Error(msg);
      }

      toast.success(`Equipe "${data.name}" atualizada com sucesso!`);
    } else {
      // Criação de equipe
      const res = await fetch(`${API_BASE_URL}/api/teams`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          project_id: data.project_id,
          is_private: data.is_private,
          avatar_url: data.avatar_url,
          owner_id: currentUserId || undefined,
          member_ids: data.member_ids,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.detail || "Erro ao criar equipe.";
        toast.error(msg);
        throw new Error(msg);
      }

      toast.success(`Equipe "${data.name}" criada com sucesso!`);
    }

    await fetchTeams();
  };

  const handleJoinTeam = async (teamId: string, teamName: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ user_id: currentUserId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Erro ao entrar na equipe.");
      }

      toast.success(`Você ingressou na equipe "${teamName}" com sucesso!`);
      await fetchTeams();
    } catch (err: any) {
      toast.error(err.message || "Não foi possível entrar na equipe.");
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    if (!confirm(`Tem certeza de que deseja excluir a equipe "${teamName}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
        method: "DELETE",
        headers: {
          ...getAuthHeader(),
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Erro ao excluir equipe.");
      }

      toast.success(`Equipe "${teamName}" excluída com sucesso.`);
      fetchTeams();
    } catch (err: any) {
      toast.error(err.message || "Não foi possível excluir a equipe.");
    }
  };

  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      const isOwner = Boolean(currentUserId && team.owner_id === currentUserId);
      const isMember = Boolean(
        currentUserId && (team.members || []).some((m) => m.id === currentUserId)
      );
      const isUserInTeam = isOwner || isMember;

      // Filtro da aba
      if (activeTab === "minhas") {
        // Na aba "Minhas Equipes", exibe apenas onde o usuário é dono ou membro
        if (!isUserInTeam) return false;
      } else if (activeTab === "explorar") {
        // Na aba "Explorar", exibe apenas as equipes em que o usuário NÃO está inserido
        if (isUserInTeam) return false;
      }

      // Filtro de busca
      if (searchTerm.trim()) {
        const search = searchTerm.toLowerCase();
        const matchName = team.name.toLowerCase().includes(search);
        const matchDesc = team.description?.toLowerCase().includes(search);
        return matchName || matchDesc;
      }

      return true;
    });
  }, [teams, activeTab, searchTerm, currentUserId]);

  return (
    <div className="w-full min-h-full flex flex-col relative overflow-hidden bg-gray-50/50">

      {/* Banner */}
      <div className="w-full bg-[#141735] relative px-8 md:px-12 pt-28 pb-40 flex justify-between items-center shadow-md min-h-[440px]">
        {/* Title */}
        <h1
          className={`text-7xl md:text-[180px] xl:text-[190px] leading-none font-black text-white tracking-tighter uppercase z-10 select-none ${leagueGothic.className}`}
          style={{ transform: "scaleY(1.3)", transformOrigin: "left" }}
        >
          EQUIPES
        </h1>

        {/* Illustration */}
        <div className="absolute right-2 md:right-14 bottom-0 z-10 w-[380px] md:w-[650px] pointer-events-none">
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
      <div className="px-6 md:px-12 py-10 flex-1 w-full max-w-7xl mx-auto flex flex-col items-center">
        {/* Actions Bar */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 relative mb-10 mt-4 z-20">
          {/* Tabs */}
          <div className="flex gap-2 bg-white p-1.5 rounded-full shadow-lg border border-gray-100">
            <button
              onClick={() => setActiveTab("minhas")}
              className={`px-7 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 ${activeTab === "minhas"
                ? "bg-[#F14343] text-white shadow-md"
                : "text-gray-500 hover:text-[#141735]"
                }`}
            >
              Minhas Equipes
            </button>
            <button
              onClick={() => setActiveTab("explorar")}
              className={`px-7 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider transition-all duration-300 ${activeTab === "explorar"
                ? "bg-[#F14343] text-white shadow-md"
                : "text-gray-500 hover:text-[#141735]"
                }`}
            >
              Explorar
            </button>
          </div>

          {/* Search & Add Button */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 md:w-64">
              <FiSearch
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar equipe..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F14343] focus:border-transparent transition-all"
              />
            </div>

            {/* Botão Adicionar Equipe */}
            <button
              onClick={handleOpenCreateModal}
              className="bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <FiPlus size={16} className="stroke-[3]" />
              <span>Adicionar Equipe</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-[#F14343] rounded-full animate-spin" />
            <p className="text-sm font-medium">Carregando equipes...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center justify-between mb-6">
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchTeams}
              className="text-xs font-bold uppercase underline hover:text-red-900"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Teams Grid */}
        {!loading && !error && (
          <div className="w-full">
            {filteredTeams.length === 0 ? (
              <div className="py-20 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#F14343] flex items-center justify-center mb-4">
                  <FiUsers size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  {activeTab === "minhas"
                    ? "Você ainda não possui equipes"
                    : "Nenhuma outra equipe disponível para explorar"}
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">
                  {activeTab === "minhas"
                    ? "Crie sua primeira equipe para colaborar em projetos com outros membros!"
                    : "Você já participa de todas as equipes cadastradas ou nenhuma equipe corresponde aos filtros."}
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FiPlus size={16} />
                  <span>Criar Nova Equipe</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeams.map((team) => {
                  const isOwner = currentUserId && team.owner_id === currentUserId;
                  const isMember =
                    currentUserId &&
                    (isOwner || (team.members || []).some((m) => m.id === currentUserId));
                  const ownerName =
                    team.owner?.full_name ||
                    (team.owner?.first_name
                      ? `${team.owner.first_name} ${team.owner.last_name || ""}`.trim()
                      : team.owner?.email) ||
                    "Tech Lead";

                  return (
                    <div
                      key={team.id}
                      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 p-6 flex flex-col justify-between group relative overflow-hidden"
                    >
                      {/* Accent top border */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#141735] via-[#F14343] to-[#141735] opacity-80" />

                      <div>
                        {/* Header do Card com Foto da Equipe */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {team.avatar_url ? (
                              <img
                                src={team.avatar_url}
                                alt={team.name}
                                className="w-11 h-11 rounded-xl object-cover border border-gray-200 shadow-sm shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#141735] to-[#F14343] text-white font-bold flex items-center justify-center text-sm shadow-sm shrink-0">
                                {team.name ? team.name.slice(0, 2).toUpperCase() : "EQ"}
                              </div>
                            )}
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#F14343] transition-colors line-clamp-1">
                              {team.name}
                            </h3>
                          </div>
                          {/* Ações de Edição/Exclusão para Dono */}
                          <div className="flex items-center gap-1 shrink-0">
                            {isOwner && (
                              <>
                                <button
                                  onClick={() => handleOpenEditModal(team)}
                                  title="Editar equipe"
                                  className="p-1.5 text-gray-400 hover:text-[#F14343] hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <FiEdit2 size={15} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTeam(team.id, team.name)}
                                  title="Excluir equipe"
                                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <FiTrash2 size={15} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Badges: Projeto e Privacidade */}
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          {team.project ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-red-50/80 text-[#d93838] border border-red-200/70">
                              <FiFolder size={13} className="text-[#F14343]" />
                              <span className="truncate max-w-[170px]">{team.project.name}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-50 text-gray-400 border border-gray-100">
                              <FiFolder size={13} />
                              <span>Sem projeto</span>
                            </span>
                          )}

                          {team.is_private ? (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                              title="Apenas o Tech Lead pode adicionar novos membros"
                            >
                              <FiLock size={12} className="text-amber-600" />
                              <span>Privada</span>
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                              title="Qualquer usuário pode ingressar a qualquer momento"
                            >
                              <FiGlobe size={12} className="text-emerald-600" />
                              <span>Pública</span>
                            </span>
                          )}
                        </div>

                        {/* Descrição */}
                        <p className="text-sm text-gray-600 line-clamp-2 mb-4 min-h-[38px]">
                          {team.description || "Nenhuma descrição fornecida."}
                        </p>
                      </div>

                      {/* Footer do Card */}
                      <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                        {/* Tech Lead */}
                        <div className="flex items-center gap-1.5" title={`Tech Lead: ${ownerName}`}>
                          <FaCrown className="text-[#F14343]" size={13} />
                          <span className="font-semibold text-gray-700 truncate max-w-[120px]">
                            {isOwner ? "Você (Tech Lead)" : ownerName}
                          </span>
                        </div>

                        {/* Ação ou Membros */}
                        <div className="flex items-center gap-2">
                          {!isMember && (
                            <>
                              {!team.is_private ? (
                                <button
                                  type="button"
                                  onClick={() => handleJoinTeam(team.id, team.name)}
                                  className="bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                                  title="Ingressar nesta equipe pública"
                                >
                                  <FiUserPlus size={13} />
                                  <span>Entrar</span>
                                </button>
                              ) : (
                                <span
                                  className="text-[11px] font-medium text-gray-400 flex items-center gap-1"
                                  title="Equipe privada: Entrada permitida apenas pelo dono"
                                >
                                  <FiLock size={11} /> Privada
                                </span>
                              )}
                            </>
                          )}

                          {/* Contador de Membros */}
                          <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                            <FiUsers size={13} className="text-gray-400" />
                            <span className="font-medium text-gray-600">
                              {team.members?.length || 1}{" "}
                              {(team.members?.length || 1) === 1 ? "membro" : "membros"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Botão Grande Visualizar Equipe (exclusivo para "Minhas equipes") */}
                      {activeTab === "minhas" && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => router.push(`/equipes/${team.id}/chat`)}
                            className="w-full py-2.5 px-4 rounded-xl bg-[#F14343] hover:bg-[#d93838] active:scale-[0.98] text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg shadow-[#F14343]/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <IoChatboxEllipses size={17} />
                            <span>Comunicar com a equipe</span>
                          </button>
                        </div>
                      )}

                      {/* Botão para membros no Explorar */}
                      {activeTab === "explorar" && isMember && (
                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => router.push(`/equipes/${team.id}/chat`)}
                            className="w-full py-2.5 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white font-bold text-xs tracking-wide transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <IoChatboxEllipses size={15} />
                            <span>Abrir chat da equipe</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Criação / Edição */}
      <TeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={editingTeam}
        currentUserId={currentUserId}
        onSave={handleSaveTeam}
      />
    </div>
  );
}
