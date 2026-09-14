-- ==============================================================================
-- PARTNER - ÍNDICES DE ALTA PERFORMANCE (SUPABASE / POSTGRESQL)
-- ==============================================================================
-- Estrutura identificada:
--   tasks -> kanban_id -> kanbans.id
--   kanbans -> project_id -> projects.id
-- ==============================================================================

-- 1. Índices na tabela tasks
CREATE INDEX IF NOT EXISTS idx_tasks_kanban_id ON public.tasks(kanban_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);

-- 2. Índices na tabela kanbans
CREATE INDEX IF NOT EXISTS idx_kanbans_project_id ON public.kanbans(project_id);

-- 3. Índices na tabela teams e team_messages
CREATE INDEX IF NOT EXISTS idx_teams_project_id ON public.teams(project_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_user_id ON public.team_messages(user_id);
