-- Drop and recreate view with security invoker
DROP VIEW IF EXISTS contribuicao_vendedores;

CREATE OR REPLACE VIEW contribuicao_vendedores 
WITH (security_invoker=true) AS
SELECT 
    p.id as user_id,
    p.nome,
    p.avatar_url,
    p.nivel,
    p.pontos,
    mc.valor_meta as meta_total,
    mc.mes_referencia,
    COALESCE(SUM(v.valor), 0) as contribuicao,
    ROUND((COALESCE(SUM(v.valor), 0) / NULLIF(mc.valor_meta, 0) * 100)::numeric, 2) as percentual_contribuicao,
    ROW_NUMBER() OVER (PARTITION BY mc.mes_referencia ORDER BY COALESCE(SUM(v.valor), 0) DESC) as posicao_ranking
FROM profiles p
CROSS JOIN metas_consolidadas mc
LEFT JOIN vendas v ON p.id = v.user_id
    AND DATE_TRUNC('month', v.data_venda::date) = DATE_TRUNC('month', mc.mes_referencia)
    AND v.status = 'Aprovado'
    AND (mc.produto_alvo IS NULL OR v.produto_nome = mc.produto_alvo)
WHERE EXISTS (
    SELECT 1 FROM user_roles ur 
    WHERE ur.user_id = p.id AND ur.role = 'vendedor'
)
GROUP BY p.id, p.nome, p.avatar_url, p.nivel, p.pontos, mc.valor_meta, mc.mes_referencia
ORDER BY mc.mes_referencia DESC, contribuicao DESC;