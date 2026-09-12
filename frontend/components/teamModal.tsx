"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  FiX,
  FiUsers,
  FiAlignLeft,
  FiCheck,
  FiSearch,
  FiUserPlus,
  FiFolder,
  FiPlus,
  FiAlertTriangle,
  FiLock,
  FiGlobe,
  FiCamera,
  FiUpload,
  FiTrash2,
} from "react-icons/fi";
import { FaCrown } from "react-icons/fa";
import { toast } from "react-toastify";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface TeamMember {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
}

export interface ProjectOption {
  id: string;
  name: string;
  description?: string | null;
}

interface UserOption {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
}

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string | null;
  initialData?: {
    id?: string;
    name: string;
    description?: string | null;
    owner_id?: string;
    project_id?: string | null;
    project?: ProjectOption | null;
    is_private?: boolean;
    avatar_url?: string | null;
    members?: TeamMember[];
  } | null;
  onSave: (data: {
    name: string;
    description?: string;
    project_id: string;
    is_private: boolean;
    avatar_url?: string;
    member_ids: string[];
  }) => Promise<void>;
}

export function TeamModal({
  isOpen,
  onClose,
  currentUserId,
  initialData,
  onSave,
}: TeamModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectOption[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado para criação rápida de novo projeto
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creatingProjectLoading, setCreatingProjectLoading] = useState(false);

  const isEditing = Boolean(initialData?.id);
  const ownerId = initialData?.owner_id || currentUserId || "";

  const getHeaders = () => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("partner_token") ||
          sessionStorage.getItem("partner_token")
        : null;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  // Carrega projetos e usuários disponíveis
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoadingUsers(true);
      setLoadingProjects(true);

      try {
        const projRes = await fetch(`${API_BASE_URL}/api/projects`, {
          headers: getHeaders(),
        });
        if (projRes.ok) {
          const projs: ProjectOption[] = await projRes.json();
          setAllProjects(projs);
        }
      } catch (err) {
        console.error("Erro ao carregar projetos:", err);
      } finally {
        setLoadingProjects(false);
      }

      try {
        const userRes = await fetch(`${API_BASE_URL}/api/users`, {
          headers: getHeaders(),
        });
        if (userRes.ok) {
          const users: UserOption[] = await userRes.json();
          setAllUsers(users);
        }
      } catch (err) {
        console.error("Erro ao carregar usuários:", err);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchData();
  }, [isOpen]);

  // Inicializa os campos quando o modal abre ou initialData muda
  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setDescription(initialData.description || "");
      setProjectId(initialData.project_id || initialData.project?.id || "");
      setIsPrivate(Boolean(initialData.is_private));
      setAvatarUrl(initialData.avatar_url || "");
      setFileName("");
      const existingIds = (initialData.members || []).map((m) => m.id);
      if (ownerId && !existingIds.includes(ownerId)) {
        existingIds.push(ownerId);
      }
      setSelectedMemberIds(existingIds);
    } else {
      setName("");
      setDescription("");
      setProjectId("");
      setIsPrivate(false);
      setAvatarUrl("");
      setFileName("");
      setSelectedMemberIds(ownerId ? [ownerId] : []);
    }
    setUserSearch("");
    setIsCreatingProject(false);
    setNewProjectName("");
    setError(null);
  }, [initialData, isOpen, ownerId]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      const msg = "Selecione um arquivo de imagem válido (PNG, JPG, WebP, SVG).";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      const msg = "A foto da equipe deve ter no máximo 4MB.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setAvatarUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setAvatarUrl("");
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Criar novo projeto rapidamente
  const handleCreateQuickProject = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreatingProjectLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ name: newProjectName.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Erro ao criar projeto.");
      }

      const created: ProjectOption = await res.json();
      setAllProjects((prev) => [...prev, created]);
      setProjectId(created.id);
      setIsCreatingProject(false);
      setNewProjectName("");
      toast.success(`Projeto "${created.name}" criado com sucesso!`);
    } catch (err: any) {
      const msg = err.message || "Erro ao criar projeto.";
      setError(msg);
      toast.error(msg);
    } finally {
      setCreatingProjectLoading(false);
    }
  };

  // Mapeamento de usuários selecionados
  const selectedMembers = useMemo(() => {
    const map = new Map<string, UserOption>();
    allUsers.forEach((u) => map.set(u.id, u));

    if (initialData?.members) {
      initialData.members.forEach((m) => {
        if (!map.has(m.id)) {
          map.set(m.id, m);
        } else {
          const existing = map.get(m.id)!;
          if (!existing.avatar_url && m.avatar_url) {
            map.set(m.id, { ...existing, avatar_url: m.avatar_url });
          }
        }
      });
    }

    return selectedMemberIds
      .map((id) => map.get(id))
      .filter((u): u is UserOption => Boolean(u));
  }, [selectedMemberIds, allUsers, initialData]);

  // Usuários disponíveis para adicionar
  const availableUsers = useMemo(() => {
    return allUsers.filter((u) => {
      if (selectedMemberIds.includes(u.id)) return false;
      if (!userSearch.trim()) return true;

      const q = userSearch.toLowerCase();
      const nameMatch =
        (u.full_name?.toLowerCase().includes(q) || false) ||
        (u.first_name?.toLowerCase().includes(q) || false) ||
        (u.last_name?.toLowerCase().includes(q) || false);
      const emailMatch = u.email.toLowerCase().includes(q);
      return nameMatch || emailMatch;
    });
  }, [allUsers, selectedMemberIds, userSearch]);

  const handleAddMember = (user: UserOption) => {
    if (!selectedMemberIds.includes(user.id)) {
      setSelectedMemberIds([...selectedMemberIds, user.id]);
    }
    setUserSearch("");
  };

  const handleRemoveMember = (userId: string) => {
    if (userId === ownerId) return;
    setSelectedMemberIds(selectedMemberIds.filter((id) => id !== userId));
  };

  const getUserDisplayName = (u: UserOption) => {
    return (
      u.full_name ||
      (u.first_name ? `${u.first_name} ${u.last_name || ""}`.trim() : null) ||
      u.email.split("@")[0]
    );
  };

  const getUserInitials = (u: UserOption) => {
    const name = getUserDisplayName(u);
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      const msg = "O nome da equipe é obrigatório.";
      setError(msg);
      toast.error(msg);
      return;
    }

    if (!projectId.trim()) {
      const msg = "Não é permitido criar ou manter uma equipe sem projeto. Selecione um projeto obrigatório.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setLoading(true);
    setError(null);

    const membersToSend =
      ownerId && !selectedMemberIds.includes(ownerId)
        ? [ownerId, ...selectedMemberIds]
        : selectedMemberIds;

    try {
      await onSave({
        name: name.trim(),
        description: description.trim() || undefined,
        project_id: projectId.trim(),
        is_private: isPrivate,
        avatar_url: avatarUrl || undefined,
        member_ids: membersToSend,
      });
      onClose();
    } catch (err: any) {
      const msg = err.message || "Erro ao salvar equipe.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 transition-all duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#121214] border border-zinc-800/90 w-full max-w-xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col relative text-white animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow sutil no topo idêntico ao Edit Profile Modal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-[#F14343]/15 blur-3xl pointer-events-none" />

        {/* Header do Modal */}
        <div className="px-6 pt-6 pb-4 border-b border-zinc-800/80 flex items-center justify-between relative z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <FiUsers className="text-[#F14343]" size={22} />
              <span>{isEditing ? "Editar Equipe" : "Nova Equipe"}</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {isEditing
                ? "Atualize as informações, projeto vinculado e integrantes da equipe"
                : "Crie uma nova equipe vinculada ao projeto e adicione integrantes"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/70 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            disabled={loading}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Corpo com Scroll */}
        <form id="team-form" onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-5 relative z-10">
          {error && (
            <div className="text-xs text-red-300 bg-red-950/60 border border-red-800/70 p-3 rounded-xl flex items-center gap-2">
              <FiAlertTriangle size={16} className="text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Seção Foto da Equipe */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800/80 flex items-center gap-4">
            <div className="relative shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Foto da Equipe"
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#F14343] shadow-md shadow-[#F14343]/20"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#141735] to-[#F14343] flex items-center justify-center text-white font-bold text-lg shadow-md border border-zinc-700">
                  {name ? name.slice(0, 2).toUpperCase() : <FiCamera size={22} className="text-zinc-300" />}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <FiCamera className="text-[#F14343]" size={14} />
                <span>Foto da Equipe</span>
              </label>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white border border-zinc-700 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <FiUpload size={12} />
                  <span>{avatarUrl ? "Trocar foto" : "Carregar foto"}</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-xs font-medium text-red-300 border border-red-800/50 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <FiTrash2 size={12} />
                    <span>Remover</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-zinc-500 truncate">
                {fileName ? fileName : "JPG, PNG ou WebP (máx. 4MB)"}
              </p>
            </div>
          </div>

          {/* Campo Nome da Equipe */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <FiUsers className="text-zinc-400" />
              <span>Nome da Equipe <strong className="text-[#F14343]">*</strong></span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Squad Frontend, Design Ops..."
              required
              maxLength={100}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c20] border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F14343] focus:ring-2 focus:ring-[#F14343]/20 transition-all"
              disabled={loading}
            />
          </div>

          {/* Campo Seleção de Projeto */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <FiFolder className="text-[#F14343]" />
                <span>Projeto Vinculado <strong className="text-[#F14343]">*</strong></span>
              </label>
              {!isCreatingProject && (
                <button
                  type="button"
                  onClick={() => setIsCreatingProject(true)}
                  className="text-xs font-semibold text-[#F14343] hover:text-[#d93838] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FiPlus size={13} />
                  <span>Novo Projeto</span>
                </button>
              )}
            </div>

            {/* Criação Rápida de Projeto */}
            {isCreatingProject ? (
              <div className="p-3 bg-[#1c1c20] border border-zinc-800 rounded-xl space-y-2">
                <p className="text-xs text-zinc-300 font-medium">Nome do novo projeto:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Ex: App Mobile Partner..."
                    className="flex-1 px-3 py-2 bg-[#121214] border border-zinc-700 rounded-lg text-xs font-medium text-white placeholder-zinc-500 focus:outline-none focus:border-[#F14343]"
                    disabled={creatingProjectLoading}
                  />
                  <button
                    type="button"
                    onClick={handleCreateQuickProject}
                    disabled={creatingProjectLoading || !newProjectName.trim()}
                    className="bg-[#F14343] hover:bg-[#d93838] text-white px-3.5 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {creatingProjectLoading ? "Criando..." : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingProject(false);
                      setNewProjectName("");
                    }}
                    className="px-2.5 py-2 text-zinc-400 hover:text-white text-xs font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="relative">
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    required
                    className={`w-full px-4 py-2.5 pr-8 rounded-xl bg-[#1c1c20] border text-sm focus:outline-none focus:border-[#F14343] focus:ring-2 focus:ring-[#F14343]/20 transition-all cursor-pointer appearance-none ${
                      !projectId ? "border-zinc-800 text-zinc-400" : "border-zinc-700 text-white"
                    }`}
                    disabled={loading || loadingProjects}
                  >
                    <option value="" disabled className="bg-[#1c1c20] text-zinc-500">
                      Selecione um projeto obrigatório...
                    </option>
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id} className="bg-[#1c1c20] text-white">
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {allProjects.length === 0 && !loadingProjects && (
                  <p className="text-[11px] text-amber-400/90 flex items-center gap-1">
                    <span>Nenhum projeto cadastrado. Use o botão <strong>+ Novo Projeto</strong> acima para criar um projeto obrigatório.</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Campo Descrição */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <FiAlignLeft className="text-zinc-400" />
              <span>Descrição <span className="text-zinc-500 font-normal">(opcional)</span></span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o propósito ou os objetivos desta equipe..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-[#1c1c20] border border-zinc-800 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#F14343] focus:ring-2 focus:ring-[#F14343]/20 transition-all resize-none"
              disabled={loading}
            />
          </div>

          {/* Campo Privacidade da Equipe */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800/80 space-y-2.5">
            <label className="block text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <FiLock className="text-[#F14343]" />
              <span>Privacidade da Equipe <strong className="text-[#F14343]">*</strong></span>
            </label>
            <p className="text-[11px] text-zinc-400">
              Defina as permissões de ingresso nesta equipe.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {/* Opção Pública */}
              <button
                type="button"
                onClick={() => setIsPrivate(false)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                  !isPrivate
                    ? "bg-[#F14343]/10 border-[#F14343] text-white shadow-sm shadow-[#F14343]/20"
                    : "bg-[#1c1c20] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <FiGlobe className={!isPrivate ? "text-[#F14343]" : "text-zinc-500"} size={15} />
                    <span>Pública</span>
                  </span>
                  {!isPrivate && (
                    <span className="w-2 h-2 rounded-full bg-[#F14343] shadow-[0_0_8px_#F14343]" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Qualquer usuário pode entrar na equipe a qualquer momento.
                </p>
              </button>

              {/* Opção Privada */}
              <button
                type="button"
                onClick={() => setIsPrivate(true)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between relative ${
                  isPrivate
                    ? "bg-[#F14343]/10 border-[#F14343] text-white shadow-sm shadow-[#F14343]/20"
                    : "bg-[#1c1c20] border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <FiLock className={isPrivate ? "text-[#F14343]" : "text-zinc-500"} size={15} />
                    <span>Privada</span>
                  </span>
                  {isPrivate && (
                    <span className="w-2 h-2 rounded-full bg-[#F14343] shadow-[0_0_8px_#F14343]" />
                  )}
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-400">
                  Apenas o Tech Lead pode adicionar novos integrantes.
                </p>
              </button>
            </div>
          </div>

          {/* Seção Integrantes da Equipe */}
          <div className="p-4 rounded-2xl bg-[#18181b] border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <FiUsers className="text-[#F14343]" />
                <span>Integrantes da Equipe</span>
                <span className="bg-[#F14343]/20 text-[#F14343] px-2 py-0.5 rounded-full text-[11px] font-bold">
                  {selectedMemberIds.length}
                </span>
              </label>
            </div>

            {/* Campo de Busca para Adicionar Integrante */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <FiSearch size={15} />
              </div>
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Buscar usuário por nome ou e-mail..."
                className="w-full pl-9 pr-4 py-2 bg-[#1c1c20] border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#F14343] transition-all"
                disabled={loading || loadingUsers}
              />
            </div>

            {/* Sugestões de Usuários Disponíveis para Adicionar */}
            {userSearch.trim() && (
              <div className="bg-[#1c1c20] border border-zinc-800 rounded-xl shadow-xl max-h-44 overflow-y-auto divide-y divide-zinc-800">
                {loadingUsers ? (
                  <p className="p-3 text-xs text-zinc-400 text-center">
                    Carregando usuários...
                  </p>
                ) : availableUsers.length === 0 ? (
                  <p className="p-3 text-xs text-zinc-400 text-center">
                    Nenhum usuário disponível.
                  </p>
                ) : (
                  availableUsers.slice(0, 6).map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => handleAddMember(u)}
                      className="w-full px-3.5 py-2.5 flex items-center justify-between hover:bg-zinc-800/80 transition-colors text-left group cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-200 flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden relative">
                          <span>{getUserInitials(u)}</span>
                          <img
                            src={u.avatar_url || "/Avatar1.svg"}
                            alt={getUserDisplayName(u)}
                            className="w-full h-full object-cover absolute inset-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-semibold text-white group-hover:text-[#F14343] transition-colors truncate">
                            {getUserDisplayName(u)}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[#F14343] text-xs font-semibold shrink-0">
                        <FiUserPlus size={13} />
                        <span>Adicionar</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Lista dos Integrantes Selecionados */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {selectedMembers.map((member) => {
                const isOwner = member.id === ownerId;
                return (
                  <div
                    key={member.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isOwner
                        ? "bg-[#F14343]/10 border-[#F14343]/30"
                        : "bg-[#1c1c20] border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden relative ${
                          isOwner
                            ? "bg-[#F14343] text-white shadow-sm shadow-[#F14343]/40"
                            : "bg-zinc-800 border border-zinc-700 text-zinc-200"
                        }`}
                      >
                        <span>{getUserInitials(member)}</span>
                        <img
                          src={member.avatar_url || "/Avatar1.svg"}
                          alt={getUserDisplayName(member)}
                          className="w-full h-full object-cover absolute inset-0"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display = "none";
                          }}
                        />
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-white truncate">
                            {getUserDisplayName(member)}
                          </p>
                          {isOwner && (
                            <span className="bg-[#F14343] text-white text-[9px] font-black uppercase px-1.5 py-0.2 rounded flex items-center gap-1 shrink-0">
                              <FaCrown size={9} />
                              <span>Tech Lead</span>
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 truncate">
                          {member.email}
                        </p>
                      </div>
                    </div>

                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-1 text-zinc-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors shrink-0 cursor-pointer"
                        title="Remover integrante"
                        disabled={loading}
                      >
                        <FiX size={15} />
                      </button>
                    )}
                  </div>
                );
              })}

              {selectedMembers.length === 0 && (
                <p className="text-xs text-zinc-500 py-2 text-center">
                  Nenhum integrante adicional adicionado.
                </p>
              )}
            </div>
          </div>
        </form>

        {/* Rodapé com botões de Ação */}
        <div className="px-6 py-4 border-t border-zinc-800/80 flex items-center justify-end gap-3 bg-[#151518] relative z-10 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 transition-all cursor-pointer disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="team-form"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white shadow-lg shadow-[#F14343]/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Salvando...</span>
            ) : (
              <>
                <FiCheck size={16} />
                <span>{isEditing ? "Salvar Alterações" : "Criar Equipe"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
