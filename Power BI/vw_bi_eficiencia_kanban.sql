-- ==============================================================================
-- 📄 PÁGINA 2: EFICIÊNCIA OPERACIONAL & GESTÃO ÁGIL (KANBAN)
-- ==============================================================================
-- View: vw_bi_eficiencia_kanban
-- Objetivo: Granularidade no nível da tarefa. Calcula Lead Time, tempo de
--           envelhecimento (Aging WIP), coluna Kanban e situação de pontualidade.
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_bi_eficiencia_kanban AS
SELECT 
    t.id AS tarefa_id,
    t.title AS tarefa_titulo,
    t.status AS status_slug,
    CASE 
        WHEN t.status = 'todo' THEN '1 - A Fazer'
        WHEN t.status = 'in_progress' THEN '2 - Em Progresso'
        WHEN t.status = 'review' THEN '3 - Em Revisão'
        WHEN t.status = 'done' THEN '4 - Concluído'
        ELSE '5 - Outro'
    END AS status_nome,
    t.priority AS prioridade_slug,
    CASE 
        WHEN t.priority = 'high' THEN 'Alta'
        WHEN t.priority = 'medium' THEN 'Média'
        WHEN t.priority = 'low' THEN 'Baixa'
        ELSE 'Média'
    END AS prioridade_nome,
    p.id AS projeto_id,
    p.name AS projeto_nome,
    u.id AS responsavel_id,
    COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Não atribuído') AS responsavel_nome,
    t.created_at AS data_criacao,
    t.due_date AS data_limite,
    t.updated_at AS data_ultima_atualizacao,
    
    -- Lead Time em dias (da criação até conclusão da tarefa)
    CASE 
        WHEN t.status = 'done' THEN 
            GREATEST(1, ROUND(EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 86400, 1))
        ELSE NULL 
    END AS lead_time_dias,
    
    -- Aging WIP: dias corridos em que a tarefa está em aberto
    ROUND(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - t.created_at)) / 86400, 1) AS dias_em_aberto,
    
    -- Situação da entrega e pontualidade
    CASE 
        WHEN t.status = 'done' AND (t.due_date IS NULL OR t.updated_at::date <= t.due_date::date) THEN 'No Prazo'
        WHEN t.status = 'done' AND t.updated_at::date > t.due_date::date THEN 'Entregue com Atraso'
        WHEN t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date::date < CURRENT_DATE THEN 'Atrasada (Em Aberto)'
        ELSE 'Dentro do Prazo'
    END AS situacao_prazo
FROM public.tasks t
INNER JOIN public.kanbans k ON k.id = t.kanban_id
INNER JOIN public.projects p ON p.id = k.project_id
LEFT JOIN public.users u ON u.id = t.assignee_id;
