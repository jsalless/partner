"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  FiArrowLeft,
  FiPlus,
  FiSearch,
  FiFilter,
  FiCalendar,
  FiUser,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
  FiFolder,
  FiLayers,
  FiX,
  FiCheck,
  FiUsers,
  FiEdit2,
  FiAlignLeft,
  FiClock,
  FiTag,
} from "react-icons/fi";
import { toast } from "react-toastify";

interface ProjectDetails {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string | null;
  teams_count?: number;
}

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high";

export interface TaskAssignee {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface KanbanTask {
  id: string;
  kanban_id?: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string | null;
  assignee_id?: string | null;
  assignee?: TaskAssignee | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProjectUser {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  role?: string | null;
  avatar_url?: string | null;
  team_name?: string | null;
}

const COLUMNS: { id: TaskStatus; title: string; color: string; bgBadge: string; textBadge: string; borderTop: string }[] = [
  {
    id: "todo",
    title: "A Fazer",
    color: "bg-[#EE0AAE]",
    bgBadge: "bg-[#EE0AAE]",
    textBadge: "text-[#870663]",
    borderTop: "border-[#EE0AAE]",
  },
  {
    id: "in_progress",
    title: "Em Progresso",
    color: "bg-amber-50/70",
    bgBadge: "bg-amber-100",
    textBadge: "text-amber-800",
    borderTop: "border-amber-400",
  },
  {
    id: "review",
    title: "Em Revisão",
    color: "bg-indigo-50/60",
    bgBadge: "bg-indigo-100",
    textBadge: "text-indigo-800",
    borderTop: "border-indigo-400",
  },
  {
    id: "done",
    title: "Concluído",
    color: "bg-emerald-50/60",
    bgBadge: "bg-emerald-100",
    textBadge: "text-emerald-800",
    borderTop: "border-emerald-500",
  },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function ProjectKanbanPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.id as string;

  const [project, setProject] = useState<ProjectDetails | null>(null);
  const [loadingProject, setLoadingProject] = useState(true);
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  // Drag and drop state
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatus | null>(null);
  const isDraggingRef = useRef(false);

  // Modal de Criação de Tarefa
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [targetColumn, setTargetColumn] = useState<TaskStatus>("todo");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>("medium");
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [submittingTask, setSubmittingTask] = useState(false);

  // Modal de Detalhe / Versão Estendida da Tarefa
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isEditingDetail, setIsEditingDetail] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("medium");
  const [editStatus, setEditStatus] = useState<TaskStatus>("todo");
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const getAuthHeader = useCallback((): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token =
      localStorage.getItem("partner_token") || sessionStorage.getItem("partner_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  // 1. Carregar dados do projeto
  const fetchProject = useCallback(async () => {
    if (!projectId) return;
    setLoadingProject(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        setProject({
          id: projectId,
          name: "Projeto",
          description: "Gerenciamento de tarefas do projeto",
        });
      }
    } catch {
      setProject({
        id: projectId,
        name: "Projeto",
        description: "Gerenciamento de tarefas do projeto",
      });
    } finally {
      setLoadingProject(false);
    }
  }, [projectId, getAuthHeader]);

  // 2. Carregar Kanban e Tarefas do Banco
  const fetchKanban = useCallback(async () => {
    if (!projectId) return;
    setLoadingTasks(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/kanban`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setTasks(data.tasks || []);
      } else {
        toast.error("Não foi possível carregar as tarefas do Kanban.");
      }
    } catch (err) {
      console.error("Erro ao buscar kanban:", err);
      toast.error("Erro de conexão ao carregar o Kanban.");
    } finally {
      setLoadingTasks(false);
    }
  }, [projectId, getAuthHeader]);

  // 3. Carregar usuários exclusivos do projeto
  const fetchProjectUsers = useCallback(async () => {
    if (!projectId) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/users`, {
        headers: getAuthHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setProjectUsers(data || []);
      }
    } catch (err) {
      console.error("Erro ao buscar usuários do projeto:", err);
    } finally {
      setLoadingUsers(false);
    }
  }, [projectId, getAuthHeader]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchKanban();
      fetchProjectUsers();
    }
  }, [projectId, fetchProject, fetchKanban, fetchProjectUsers]);

  // Abertura do modal de criação
  const handleOpenAddTask = (columnId: TaskStatus = "todo") => {
    setTargetColumn(columnId);
    setNewTaskTitle("");
    setNewTaskDesc("");
    setNewTaskPriority("medium");
    setNewTaskAssigneeId("");
    setNewTaskDueDate("");
    setIsTaskModalOpen(true);
  };

  // Criação de tarefa
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      toast.warning("Informe o título da tarefa.");
      return;
    }

    const columnToAssign = targetColumn; // Garante captura da coluna escolhida

    setSubmittingTask(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: newTaskTitle.trim(),
          description: newTaskDesc.trim() || null,
          status: columnToAssign,
          priority: newTaskPriority,
          due_date: newTaskDueDate || null,
          assignee_id: newTaskAssigneeId || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Erro ao criar tarefa.");
      }

      const createdTask: KanbanTask = await res.json();
      createdTask.status = columnToAssign;

      setTasks((prev) => [createdTask, ...prev]);
      const colTitle = COLUMNS.find((c) => c.id === columnToAssign)?.title || "coluna";
      toast.success(`Tarefa adicionada na coluna "${colTitle}"!`);
      setIsTaskModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar tarefa.");
    } finally {
      setSubmittingTask(false);
    }
  };

  // Mover tarefa para status específico (usado por botões e Drag & Drop)
  const applyTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask || currentTask.status === newStatus) return;

    // Otimista
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => prev ? { ...prev, status: newStatus } : null);
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error("Falha ao persistir status no banco.");
      }
    } catch (err) {
      toast.error("Erro ao salvar mudança de coluna.");
      // Reverter
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: currentTask.status } : t))
      );
      if (selectedTask && selectedTask.id === taskId) {
        setSelectedTask(currentTask);
      }
    }
  };

  // Botões de anterior / avançar
  const handleMoveTask = (taskId: string, direction: "prev" | "next") => {
    const statusOrder: TaskStatus[] = ["todo", "in_progress", "review", "done"];
    const currentTask = tasks.find((t) => t.id === taskId);
    if (!currentTask) return;

    const currentIndex = statusOrder.indexOf(currentTask.status);
    const targetIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (targetIndex >= 0 && targetIndex < statusOrder.length) {
      applyTaskStatusChange(taskId, statusOrder[targetIndex]);
    }
  };

  // Exclusão de tarefa
  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Deseja realmente excluir esta tarefa do banco de dados?")) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });

      if (!res.ok) {
        throw new Error("Erro ao excluir tarefa.");
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      if (selectedTask?.id === taskId) {
        setIsDetailModalOpen(false);
        setSelectedTask(null);
      }
      toast.info("Tarefa excluída.");
    } catch (err: any) {
      toast.error(err.message || "Não foi possível excluir a tarefa.");
    }
  };

  // DRAG AND DROP HANDLERS
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    isDraggingRef.current = true;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetCol: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    
    // Limpa estado de drag imediatamente para resposta instantânea
    setDraggedTaskId(null);
    setDragOverColumn(null);
    isDraggingRef.current = false;

    if (taskId) {
      applyTaskStatusChange(taskId, targetCol);
    }
  };

  // MODAL EXTENDIDO / DETALHES DA TAREFA
  const handleOpenTaskDetail = (task: KanbanTask) => {
    if (isDraggingRef.current) return;
    setSelectedTask(task);
    setIsEditingDetail(false);
    setEditTitle(task.title);
    setEditDesc(task.description || "");
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditAssigneeId(task.assignee_id || "");
    setEditDueDate(task.due_date || "");
    setIsDetailModalOpen(true);
  };

  const handleSaveTaskEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    if (!editTitle.trim()) {
      toast.warning("Informe o título da tarefa.");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/tasks/${selectedTask.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDesc.trim() || null,
          priority: editPriority,
          status: editStatus,
          due_date: editDueDate || null,
          assignee_id: editAssigneeId || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Erro ao salvar alterações da tarefa.");
      }

      const updated: KanbanTask = await res.json();
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      setSelectedTask(updated);
      setIsEditingDetail(false);
      toast.success("Tarefa atualizada com sucesso!");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar tarefa.");
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const assigneeName = t.assignee?.full_name || t.assignee?.email || "";
      const matchesSearch =
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        assigneeName.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPriority =
        priorityFilter === "all" || t.priority === priorityFilter;

      return matchesSearch && matchesPriority;
    });
  }, [tasks, searchTerm, priorityFilter]);

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case "high":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
            Alta
          </span>
        );
      case "medium":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
            Média
          </span>
        );
      case "low":
        return (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
            Baixa
          </span>
        );
    }
  };

  return (
    <div className="w-full min-h-screen flex flex-col bg-slate-50/60 pb-12">
      {/* Top Header Navigation */}
      <div className="bg-[#141735] text-white pt-8 pb-10 px-6 md:px-12 shadow-md relative overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#F14343]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col gap-6 relative z-10">
          {/* Back button & Breadcrumb */}
          <div className="flex items-center justify-between">
            <Link
              href="/projetos"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-300 hover:text-white bg-white/10 hover:bg-white/15 px-4 py-2 rounded-full transition-all duration-200"
            >
              <FiArrowLeft size={16} />
              <span>Voltar para Projetos</span>
            </Link>

            <div className="flex items-center gap-3">
              <span className="text-[11px] text-gray-300 bg-black/25 px-3.5 py-1.5 rounded-full font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EE0AAE] animate-pulse" />
                Arraste os cards para mover
              </span>
              <span className="text-xs text-gray-300 bg-black/25 px-3.5 py-1.5 rounded-full font-medium flex items-center gap-2">
                <FiLayers className="text-[#F14343]" />
                Quadro Kanban
              </span>
            </div>
          </div>

          {/* Project Title & Meta */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#F14343] to-[#ff6b6b] text-white flex items-center justify-center shadow-lg shrink-0">
                <FiFolder size={28} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                  {loadingProject ? "Carregando projeto..." : project?.name || "Projeto"}
                </h1>
                <p className="text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
                  {project?.description || "Tarefas e fluxo de trabalho vinculados a este projeto."}
                </p>
              </div>
            </div>

            {/* Quick Action Button */}
            <button
              onClick={() => handleOpenAddTask("todo")}
              className="bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white px-6 py-3 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 shrink-0 cursor-pointer self-start md:self-auto"
            >
              <FiPlus size={18} className="stroke-[3]" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 py-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <FiSearch
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar tarefas por título, descrição ou responsável..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F14343] focus:border-transparent transition-all"
            />
          </div>

          {/* Priority Filters */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1 flex items-center gap-1">
              <FiFilter size={13} />
              Prioridade:
            </span>
            {(["all", "high", "medium", "low"] as const).map((p) => {
              const labels: Record<string, string> = {
                all: "Todas",
                high: "Alta",
                medium: "Média",
                low: "Baixa",
              };
              const active = priorityFilter === p;
              return (
                <button
                  key={p}
                  onClick={() => setPriorityFilter(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    active
                      ? "bg-[#141735] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="max-w-7xl mx-auto w-full px-6 md:px-12 flex-1">
        {loadingTasks ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3 text-gray-400">
            <div className="w-8 h-8 border-3 border-gray-200 border-t-[#F14343] rounded-full animate-spin" />
            <p className="text-sm font-medium">Carregando tarefas do banco de dados...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-start">
            {COLUMNS.map((column) => {
              const columnTasks = filteredTasks.filter((t) => t.status === column.id);
              const isOverThisColumn = dragOverColumn === column.id;

              return (
                <div
                  key={column.id}
                  onDragOver={(e) => handleDragOver(e, column.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, column.id)}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col overflow-hidden min-h-[520px] ${
                    isOverThisColumn
                      ? "border-2 border-[#EE0AAE] shadow-lg ring-4 ring-[#EE0AAE]/10 scale-[1.01]"
                      : "border-gray-200 shadow-sm"
                  }`}
                >
                  {/* Column Top Accent */}
                  <div className={`h-1.5 w-full border-t-4 ${column.borderTop}`} />

                  {/* Column Header */}
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="font-bold text-sm text-gray-800 tracking-tight">
                        {column.title}
                      </h2>
                      <span
                        className={`text-xs font-black px-2 py-0.5 rounded-full ${column.bgBadge} ${column.textBadge}`}
                      >
                        {columnTasks.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenAddTask(column.id);
                      }}
                      title={`Adicionar tarefa em ${column.title}`}
                      className="w-7 h-7 rounded-lg text-gray-400 hover:text-[#EE0AAE] hover:bg-pink-50 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <FiPlus size={16} />
                    </button>
                  </div>

                  {/* Column Body / Task Cards */}
                  <div
                    className={`p-3 flex-1 flex flex-col gap-3 transition-colors duration-200 ${
                      isOverThisColumn ? "bg-pink-50/20" : "bg-gray-50/50"
                    }`}
                  >
                    {columnTasks.length === 0 ? (
                      <div className="py-16 px-4 text-center flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200/60 rounded-xl my-auto">
                        <p className="text-xs font-medium">Nenhuma tarefa nesta coluna</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">Arraste uma tarefa aqui ou clique abaixo</p>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddTask(column.id);
                          }}
                          className="mt-2 text-xs font-bold text-[#EE0AAE] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <FiPlus size={13} />
                          <span>Adicionar em {column.title}</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        {columnTasks.map((task) => {
                          const columnIndex = COLUMNS.findIndex((c) => c.id === task.status);
                          const canMoveLeft = columnIndex > 0;
                          const canMoveRight = columnIndex < COLUMNS.length - 1;
                          const isBeingDragged = draggedTaskId === task.id;

                          return (
                            <div
                              key={task.id}
                              draggable
                              onDragStart={(e) => handleDragStart(e, task.id)}
                              onDragEnd={handleDragEnd}
                              onClick={() => handleOpenTaskDetail(task)}
                              className={`bg-white rounded-xl border p-4 transition-all duration-150 flex flex-col gap-2.5 group relative cursor-grab active:cursor-grabbing select-none ${
                                isBeingDragged
                                  ? "opacity-30 scale-[0.98] border-gray-300 shadow-inner"
                                  : "border-gray-200/80 shadow-sm hover:shadow-md hover:border-gray-300"
                              }`}
                            >
                              {/* Card Header: Priority, Hint & Delete */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getPriorityBadge(task.priority)}
                                  <span className="text-[10px] text-gray-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                    <span>Ver detalhes</span>
                                  </span>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTask(task.id);
                                  }}
                                  title="Excluir tarefa"
                                  className="text-gray-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                >
                                  <FiTrash2 size={13} />
                                </button>
                              </div>

                              {/* Title */}
                              <h3 className="font-bold text-xs md:text-sm text-gray-900 leading-snug group-hover:text-[#F14343] transition-colors">
                                {task.title}
                              </h3>

                              {/* Description preview */}
                              {task.description ? (
                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              ) : (
                                <p className="text-[11px] text-gray-300 italic">Sem descrição</p>
                              )}

                              {/* Assignee & Due Date */}
                              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
                                {task.assignee ? (
                                  <span className="flex items-center gap-1.5 text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                                    {task.assignee.avatar_url ? (
                                      <img
                                        src={task.assignee.avatar_url}
                                        alt=""
                                        className="w-4 h-4 rounded-full object-cover shrink-0"
                                      />
                                    ) : (
                                      <FiUser size={11} className="text-gray-500 shrink-0" />
                                    )}
                                    <span className="truncate font-semibold">
                                      {task.assignee.full_name || task.assignee.email}
                                    </span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 italic">Sem responsável</span>
                                )}

                                {task.due_date && (
                                  <span className="flex items-center gap-1 text-gray-500">
                                    <FiCalendar size={11} />
                                    <span>{task.due_date}</span>
                                  </span>
                                )}
                              </div>

                              {/* Quick Transition Controls (Chevron Buttons) */}
                              <div
                                className="pt-2 flex items-center justify-between border-t border-gray-100/60 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  onClick={() => handleMoveTask(task.id, "prev")}
                                  disabled={!canMoveLeft}
                                  title="Mover para coluna anterior"
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                                    canMoveLeft
                                      ? "text-gray-600 hover:bg-gray-100 cursor-pointer"
                                      : "text-gray-200 cursor-not-allowed"
                                  }`}
                                >
                                  <FiChevronLeft size={14} />
                                  <span className="text-[10px] font-semibold">Anterior</span>
                                </button>

                                <button
                                  onClick={() => handleMoveTask(task.id, "next")}
                                  disabled={!canMoveRight}
                                  title="Mover para próxima coluna"
                                  className={`flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${
                                    canMoveRight
                                      ? "text-gray-600 hover:bg-gray-100 cursor-pointer font-bold text-[#F14343]"
                                      : "text-gray-200 cursor-not-allowed"
                                  }`}
                                >
                                  <span className="text-[10px] font-semibold">Avançar</span>
                                  <FiChevronRight size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {/* Botão de Adicionar ao final da lista de tarefas da coluna */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenAddTask(column.id);
                          }}
                          className="w-full py-2 px-3 rounded-xl border border-dashed border-gray-200 hover:border-[#EE0AAE] hover:bg-pink-50/20 text-gray-500 hover:text-[#870663] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                        >
                          <FiPlus size={14} className="text-[#EE0AAE]" />
                          <span>Adicionar em {column.title}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: VERSÃO EXTENDIDA DA TAREFA (DETALHES / EDIÇÃO) */}
      {isDetailModalOpen && selectedTask && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !savingEdit && setIsDetailModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Accent */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#141735] via-[#EE0AAE] to-[#F14343]" />

            {/* Modal Header */}
            <div className="px-7 pt-6 pb-4 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    COLUMNS.find((c) => c.id === selectedTask.status)?.bgBadge
                  } ${COLUMNS.find((c) => c.id === selectedTask.status)?.textBadge}`}
                >
                  {COLUMNS.find((c) => c.id === selectedTask.status)?.title}
                </span>
                {getPriorityBadge(selectedTask.priority)}
              </div>

              <div className="flex items-center gap-2">
                {!isEditingDetail && (
                  <button
                    type="button"
                    onClick={() => setIsEditingDetail(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
                  >
                    <FiEdit2 size={13} />
                    <span>Editar Tarefa</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  disabled={savingEdit}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-7 overflow-y-auto flex-1 flex flex-col gap-6">
              {isEditingDetail ? (
                /* MODO DE EDIÇÃO */
                <form onSubmit={handleSaveTaskEdit} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Título da Tarefa <span className="text-[#F14343]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      Descrição Detalhada
                    </label>
                    <textarea
                      rows={5}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="Descreva o escopo, tarefas filhas, links de design ou critérios de aceitação..."
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#F14343] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Status (Coluna)
                      </label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                      >
                        {COLUMNS.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Prioridade
                      </label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                      >
                        <option value="low">Baixa</option>
                        <option value="medium">Média</option>
                        <option value="high">Alta</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Responsável (Membros do Projeto)
                      </label>
                      <select
                        value={editAssigneeId}
                        onChange={(e) => setEditAssigneeId(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                      >
                        <option value="">Sem responsável atribuído</option>
                        {projectUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name || u.email} {u.team_name ? `(${u.team_name})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                        Prazo de Entrega
                      </label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingDetail(false)}
                      disabled={savingEdit}
                      className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-gray-600 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={savingEdit}
                      className="bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {savingEdit ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : (
                        <>
                          <FiCheck size={16} />
                          <span>Salvar Alterações</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                /* MODO DE VISUALIZAÇÃO EXTENDIDA */
                <>
                  {/* Title */}
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">
                      {selectedTask.title}
                    </h2>
                  </div>

                  {/* Description Box */}
                  <div className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <FiAlignLeft size={14} className="text-[#EE0AAE]" />
                      <span>Descrição da Tarefa</span>
                    </div>
                    {selectedTask.description ? (
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {selectedTask.description}
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Esta tarefa ainda não possui descrição detalhada. Clique em "Editar Tarefa" acima para adicionar.
                      </p>
                    )}
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Responsável */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                        {selectedTask.assignee?.avatar_url ? (
                          <img
                            src={selectedTask.assignee.avatar_url}
                            alt=""
                            className="w-full h-full rounded-xl object-cover"
                          />
                        ) : (
                          <FiUser size={18} className="text-gray-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          Responsável
                        </span>
                        <span className="text-xs font-bold text-gray-900 truncate block">
                          {selectedTask.assignee?.full_name || selectedTask.assignee?.email || "Não atribuído"}
                        </span>
                        {selectedTask.assignee?.email && selectedTask.assignee?.full_name && (
                          <span className="text-[11px] text-gray-400 truncate block">
                            {selectedTask.assignee.email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Prazo */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 text-[#F14343] flex items-center justify-center shrink-0">
                        <FiCalendar size={18} />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                          Prazo de Entrega
                        </span>
                        <span className="text-xs font-bold text-gray-900 block">
                          {selectedTask.due_date ? selectedTask.due_date : "Sem data limite"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Change Status Selector */}
                  <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                        Mover para coluna:
                      </span>
                      <select
                        value={selectedTask.status}
                        onChange={(e) => applyTaskStatusChange(selectedTask.id, e.target.value as TaskStatus)}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                      >
                        {COLUMNS.map((col) => (
                          <option key={col.id} value={col.id}>
                            {col.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(selectedTask.id)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600 hover:text-red-700 hover:bg-red-50 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer"
                    >
                      <FiTrash2 size={14} />
                      <span>Excluir Tarefa</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR NOVA TAREFA */}
      {isTaskModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => !submittingTask && setIsTaskModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent Bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#141735] via-[#EE0AAE] to-[#F14343]" />

            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-100">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">
                  Nova Tarefa
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 font-medium">Destino:</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      COLUMNS.find((c) => c.id === targetColumn)?.bgBadge
                    } ${COLUMNS.find((c) => c.id === targetColumn)?.textBadge}`}
                  >
                    {COLUMNS.find((c) => c.id === targetColumn)?.title}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(false)}
                disabled={submittingTask}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateTask} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Título da Tarefa <span className="text-[#F14343]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Ex: Implementar autenticação via OAuth"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F14343] focus:border-transparent transition-all"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Descrição da Tarefa</span>
                  <span className="text-[10px] text-gray-400 lowercase font-normal">opcional</span>
                </label>
                <textarea
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  placeholder="Detalhes, critérios de aceite, links de documentação ou escopo da tarefa..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#F14343] focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Coluna de Destino
                  </label>
                  <select
                    value={targetColumn}
                    onChange={(e) => setTargetColumn(e.target.value as TaskStatus)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                  >
                    {COLUMNS.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Prioridade
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
              </div>

              {/* Responsável - Restrito aos Usuários do Projeto */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    Responsável (Membros do Projeto)
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {projectUsers.length} {projectUsers.length === 1 ? "usuário associado" : "usuários associados"}
                  </span>
                </div>

                {loadingUsers ? (
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-400">
                    Carregando membros do projeto...
                  </div>
                ) : projectUsers.length === 0 ? (
                  <div className="w-full px-3 py-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                    <FiUsers size={14} className="shrink-0" />
                    <span>Nenhum membro associado às equipes deste projeto ainda.</span>
                  </div>
                ) : (
                  <select
                    value={newTaskAssigneeId}
                    onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                  >
                    <option value="">Sem responsável atribuído</option>
                    {projectUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} {user.team_name ? `• Equipe: ${user.team_name}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Prazo / Entrega
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#F14343]"
                />
              </div>

              {/* Modal Actions */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  disabled={submittingTask}
                  className="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="bg-[#F14343] hover:bg-[#d93838] active:scale-95 text-white px-6 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {submittingTask ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <FiCheck size={16} />
                      <span>Salvar Tarefa no Banco</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
