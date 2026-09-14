-- ==============================================================================
-- 📄 PÁGINA 3: PEOPLE ANALYTICS & MEMBRO DO MÊS
-- ==============================================================================
-- View: vw_bi_people_analytics
-- Objetivo: Granularidade no nível do colaborador/usuário. Consolida entregas,
--           taxa de pontualidade individual, atividade de chat e score ponderado.
-- ==============================================================================

CREATE OR REPLACE VIEW public.vw_bi_people_analytics AS
WITH tarefas_usuario AS (
    SELECT 
        assignee_id,
        COUNT(*) AS total_tarefas_atribuidas,
        COUNT(CASE WHEN status = 'done' THEN 1 END) AS tarefas_concluidas,
        COUNT(CASE WHEN status IN ('in_progress', 'review') THEN 1 END) AS tarefas_em_andamento,
        COUNT(CASE 
            WHEN status = 'done' AND (due_date IS NULL OR updated_at::date <= due_date::date) THEN 1 
        END) AS entregas_pontuais,
        COUNT(CASE 
            WHEN status != 'done' AND due_date IS NOT NULL AND due_date::date < CURRENT_DATE THEN 1 
        END) AS tarefas_atrasadas
    FROM public.tasks
    WHERE assignee_id IS NOT NULL
    GROUP BY assignee_id
),
mensagens_usuario AS (
    SELECT 
        user_id,
        COUNT(*) AS total_mensagens_enviadas
    FROM public.team_messages
    GROUP BY user_id
)
SELECT 
    u.id AS usuario_id,
    CONCAT(u.first_name, ' ', u.last_name) AS nome_completo,
    u.email,
    u.role AS cargo,
    u.avatar_url,
    COALESCE(tu.total_tarefas_atribuidas, 0) AS tarefas_atribuidas,
    COALESCE(tu.tarefas_concluidas, 0) AS tarefas_concluidas,
    COALESCE(tu.tarefas_em_andamento, 0) AS tarefas_em_andamento,
    COALESCE(tu.entregas_pontuais, 0) AS entregas_pontuais,
    COALESCE(tu.tarefas_atrasadas, 0) AS tarefas_atrasadas,
    COALESCE(mu.total_mensagens_enviadas, 0) AS mensagens_comunicacao,
    
    -- Taxa de Pontualidade Individual (%)
    CASE 
        WHEN COALESCE(tu.tarefas_concluidas, 0) = 0 THEN 0
        ELSE ROUND((tu.entregas_pontuais::decimal / tu.tarefas_concluidas) * 100, 1)
    END AS taxa_pontualidade_pct,
    
    -- Score Ponderado para o "Membro do Mês"
    ROUND(
        (COALESCE(tu.entregas_pontuais, 0) * 2.5) +
        (CASE WHEN COALESCE(tu.tarefas_concluidas, 0) > 0 
              THEN (tu.entregas_pontuais::decimal / tu.tarefas_concluidas) * 50 
              ELSE 0 END) +
        (LEAST(COALESCE(mu.total_mensagens_enviadas, 0), 100) * 0.2),
        1
    ) AS score_membro_mes
FROM public.users u
LEFT JOIN tarefas_usuario tu ON tu.assignee_id = u.id
LEFT JOIN mensagens_usuario mu ON mu.user_id = u.id
WHERE u.role != 'cliente'
ORDER BY score_membro_mes DESC;
