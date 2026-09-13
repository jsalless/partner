"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { League_Gothic } from "next/font/google";
import { useState, useEffect, useMemo } from "react";
import {
  FiPlus,
  FiSearch,
  FiFolder,
  FiArrowRight,
  FiCalendar,
  FiUsers,
  FiLayers,
  FiCheckCircle,
} from "react-icons/fi";
import { ProjectModal } from "@/components/projectModal";

const leagueGothic = League_Gothic({
  subsets: ["latin"],
  weight: ["400"],
});

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Project {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string | null;
  teams_count?: number;
}

export default function ProjetosPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getAuthHeader = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token =
      localStorage.getItem("partner_token") || sessionStorage.getItem("partner_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        headers: {
          ...getAuthHeader(),
        },
      });
      if (!res.ok) {
        throw new Error("Não foi possível carregar os projetos.");
      }
      const data = await res.json();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar projetos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const search = searchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        p.description?.toLowerCase().includes(search)
    );
  }, [projects, searchTerm]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "Recente";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recente";
    }
  };

  return (
    <div className="w-full min-h-full flex flex-col relative overflow-hidden bg-gray-50/50">
      {/* Banner - Idêntico ao da página de equipes */}
      <div className="w-full bg-[#141735] relative px-8 md:px-12 pt-28 pb-40 flex justify-between items-center shadow-md min-h-[440px]">
        {/* Title */}
        <h1
          className={`text-7xl md:text-[180px] xl:text-[190px] leading-none font-black text-white tracking-tighter uppercase z-10 select-none ${leagueGothic.className}`}
          style={{ transform: "scaleY(1.3)", transformOrigin: "left" }}
        >
          PROJETOS
        </h1>

        {/* Illustration */}
        <div className="absolute right-2 md:right-14 bottom-0 z-10 w-[380px] md:w-[650px] pointer-events-none">
          <Image
            src="/ProjetosPartner.svg"
            alt="Personagens Projetos Partner"
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
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 relative mb-10 mt-4 z-20">
          {/* Status Indicator / Count */}
          <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-full shadow-sm border border-gray-100">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">
              {projects.length} {projects.length === 1 ? "Projeto Ativo" : "Projetos Ativos"}
            </span>
          </div>

          {/* Search & Add Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-72">
              <FiSearch
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar projetos..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-800 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#F14343] focus:border-transparent transition-all"
              />
            </div>

            {/* Botão Adicionar Projeto */}
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer"
            >
              <FiPlus size={16} className="stroke-[3]" />
              <span>Adicionar Projeto</span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-[#F14343] rounded-full animate-spin" />
            <p className="text-sm font-medium">Carregando projetos...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="w-full bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl flex items-center justify-between mb-6">
            <p className="text-sm">{error}</p>
            <button
              onClick={fetchProjects}
              className="text-xs font-bold uppercase underline hover:text-red-900"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {/* Projects Grid */}
        {!loading && !error && (
          <div className="w-full">
            {filteredProjects.length === 0 ? (
              <div className="py-20 bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-red-50 text-[#F14343] flex items-center justify-center mb-4">
                  <FiFolder size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-1">
                  Nenhum projeto encontrado
                </h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">
                  {searchTerm.trim()
                    ? "Nenhum projeto corresponde à sua busca."
                    : "Crie seu primeiro projeto para começar a organizar equipes e tarefas no Kanban!"}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                >
                  <FiPlus size={16} />
                  <span>Criar Novo Projeto</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => router.push(`/projetos/${project.id}`)}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between group relative overflow-hidden cursor-pointer"
                  >
                    {/* Top Accent Gradient */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#141735] via-[#F14343] to-[#141735] group-hover:h-2 transition-all duration-300" />

                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3 mb-3 pt-1">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#141735] to-[#F14343] text-white font-bold flex items-center justify-center text-sm shadow-md shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <FiFolder size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#F14343] transition-colors truncate">
                              {project.name}
                            </h3>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                              <FiCheckCircle size={11} />
                              Ativo
                            </span>
                          </div>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-[#F14343] group-hover:bg-red-50 transition-colors">
                          <FiArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-xs text-gray-500 line-clamp-2 min-h-[32px] mb-6 leading-relaxed">
                        {project.description || "Nenhuma descrição fornecida para este projeto."}
                      </p>
                    </div>

                    {/* Card Footer / Metadata */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-1.5 font-medium">
                        <FiUsers size={14} className="text-gray-400" />
                        <span>
                          {project.teams_count ?? 0} {(project.teams_count ?? 0) === 1 ? "equipe" : "equipes"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-gray-400 font-medium">
                        <FiCalendar size={13} />
                        <span>{formatDate(project.created_at)}</span>
                      </div>
                    </div>

                    {/* Callout to Kanban on Hover */}
                    <div className="mt-3 bg-gray-50 group-hover:bg-[#141735] group-hover:text-white rounded-xl py-2 px-3 flex items-center justify-between text-[11px] font-semibold text-gray-600 transition-colors duration-200">
                      <span className="flex items-center gap-1.5">
                        <FiLayers size={13} className="text-[#F14343]" />
                        Abrir Kanban do Projeto
                      </span>
                      <FiArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de Criação de Projeto */}
      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchProjects}
      />
    </div>
  );
}
