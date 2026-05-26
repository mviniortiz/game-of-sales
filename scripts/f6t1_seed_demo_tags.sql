-- ─────────────────────────────────────────────────────────────────────────────
-- F6T.1 — Seed demo: tags disponíveis para a company demo.
--
-- OPCIONAL. Não é parte do deploy de produção. Aplica APENAS na company
-- demo Metria Growth (id '00000000-0000-0000-0000-000000000001').
--
-- NÃO cria assignments. Apenas torna as tags disponíveis para serem
-- atribuídas manualmente quando a UI de tags chegar em fases futuras.
--
-- Aplicação:
--   supabase db query --linked -f scripts/f6t1_seed_demo_tags.sql
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.tags (company_id, name, slug, color, category, description, created_by)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Lead quente',         'lead-quente',         'rose',    'temperatura',  'Alta intenção de fechamento no curto prazo.',   NULL),
  ('00000000-0000-0000-0000-000000000001', 'Proposta pendente',   'proposta-pendente',   'amber',   'fase',         'Aguardando retorno do lead sobre proposta enviada.', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Objeção preço',       'objecao-preco',       'orange',  'objecao',      'Lead levantou objeção relacionada a preço/orçamento.', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Diagnóstico',         'diagnostico',         'sky',     'servico',      'Conversa relacionada ao serviço de diagnóstico inicial.', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Tráfego pago',        'trafego-pago',        'violet',  'servico',      'Conversa relacionada ao serviço de tráfego pago.', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Sem fit',             'sem-fit',             'slate',   'qualificacao', 'Lead fora do ICP. Mantido para evitar reabordagem.', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Follow-up',           'follow-up',           'blue',    'acao',         'Requer follow-up agendado.', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Reunião marcada',     'reuniao-marcada',     'emerald', 'acao',         'Reunião comercial agendada com o lead.', NULL),
  ('00000000-0000-0000-0000-000000000001', 'Cliente estratégico', 'cliente-estrategico', 'purple',  'perfil',       'Conta de relevância estratégica para a agência.', NULL)
ON CONFLICT (company_id, slug) DO NOTHING;
