-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.MSI.RICH (2026-06-12) — Enriquece os deals da demo MSI: tags + previsões
--
-- Cria tags semânticas de distribuidora, atribui aos deals e preenche
-- expected_close_date (os Follow Up esfriando ficam com previsão VENCIDA, em
-- vermelho no card — reforça a dor de "dinheiro parado e prazo estourado").
--
-- Rodar APÓS demo_msi_comercio.sql:
--   npx supabase db query --linked -f supabase/seed/demo_msi_enriquecimento.sql
-- IDEMPOTENTE: tags com IDs fixos (d2a), assignments (d2f); delete/insert próprios.
-- ─────────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_company uuid := '7e2e21ac-d834-448b-a61b-79ca01255702';
  v_owner   uuid;
  v_pipe    uuid := 'd2000000-0000-4000-8000-00000000a001';
  -- tags (resolvidas por slug após o upsert)
  t_atacado   uuid;
  t_recompra  uuid;
  t_rede      uuid;
  t_farmacia  uuid;
  t_mercado   uuid;
  t_variedade uuid;
  t_altovol   uuid;
  t_inadimp   uuid;
  t_quente    uuid;
  t_objprec   uuid;
  -- estágios (pra updates de data por coluna)
  s_qualif  uuid := 'd2000000-0000-4000-8000-000000005005';
  s_standby uuid := 'd2000000-0000-4000-8000-000000005006';
  s_prop    uuid := 'd2000000-0000-4000-8000-000000005008';
  s_follow  uuid := 'd2000000-0000-4000-8000-000000005009';
  s_contato uuid := 'd2000000-0000-4000-8000-000000005004';
BEGIN
  SELECT id INTO v_owner FROM public.profiles WHERE company_id = v_company ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Sem profile na company %', v_company; END IF;

  -- ── Limpeza idempotente (só as atribuições da demo) ─────────────────────────
  DELETE FROM public.tag_assignments WHERE company_id = v_company AND (metadata->>'demo_seed') = 'DEMO.MSI';

  -- ── Tags (upsert por slug — reaproveita as que já existem na company) ────────
  INSERT INTO public.tags (company_id, name, slug, color, category, description, created_by) VALUES
    (v_company, 'Atacado',       'atacado',       'blue',    'perfil',  'Compra em volume de atacado', v_owner),
    (v_company, 'Recompra',      'recompra',      'emerald', 'relacao', 'Cliente com recompra recorrente', v_owner),
    (v_company, 'Rede',          'rede',          'violet',  'perfil',  'Cliente com múltiplas lojas', v_owner),
    (v_company, 'Farmácia',      'farmacia',      'sky',     'segmento','Farmácia ou drogaria', v_owner),
    (v_company, 'Mercado',       'mercado',       'amber',   'segmento','Mercado ou mini-mercado', v_owner),
    (v_company, 'Variedades',    'variedades',    'purple',  'segmento','Loja de variedades / importados', v_owner),
    (v_company, 'Alto volume',   'alto-volume',   'orange',  'valor',   'Pedido de alto volume', v_owner),
    (v_company, 'Atenção',       'atencao',       'red',     'risco',   'Requer atenção / risco', v_owner),
    (v_company, 'Quente',        'quente',        'rose',    'tempera',  'Lead quente, alta intenção', v_owner),
    (v_company, 'Objeção preço', 'objecao-preco', 'slate',   'objecao', 'Sinalizou objeção de preço', v_owner)
  ON CONFLICT (company_id, slug) DO UPDATE
    SET color = EXCLUDED.color, name = EXCLUDED.name, description = EXCLUDED.description, updated_at = now();

  SELECT id INTO t_atacado   FROM public.tags WHERE company_id = v_company AND slug = 'atacado';
  SELECT id INTO t_recompra  FROM public.tags WHERE company_id = v_company AND slug = 'recompra';
  SELECT id INTO t_rede      FROM public.tags WHERE company_id = v_company AND slug = 'rede';
  SELECT id INTO t_farmacia  FROM public.tags WHERE company_id = v_company AND slug = 'farmacia';
  SELECT id INTO t_mercado   FROM public.tags WHERE company_id = v_company AND slug = 'mercado';
  SELECT id INTO t_variedade FROM public.tags WHERE company_id = v_company AND slug = 'variedades';
  SELECT id INTO t_altovol   FROM public.tags WHERE company_id = v_company AND slug = 'alto-volume';
  SELECT id INTO t_inadimp   FROM public.tags WHERE company_id = v_company AND slug = 'atencao';
  SELECT id INTO t_quente    FROM public.tags WHERE company_id = v_company AND slug = 'quente';
  SELECT id INTO t_objprec   FROM public.tags WHERE company_id = v_company AND slug = 'objecao-preco';

  -- ── Atribuições (tag_assignments) ───────────────────────────────────────────
  INSERT INTO public.tag_assignments (company_id, tag_id, entity_type, entity_id, source, created_by, metadata)
  SELECT v_company, x.tag_id, 'deal', x.deal_id, x.src, v_owner, '{"demo_seed":"DEMO.MSI"}'::jsonb
  FROM (VALUES
    -- Fechamento
    ('d2000000-0000-4000-8000-000000010090'::uuid, t_variedade, 'manual'),
    ('d2000000-0000-4000-8000-000000010090'::uuid, t_recompra,  'eva_suggested'),
    ('d2000000-0000-4000-8000-000000010091'::uuid, t_variedade, 'manual'),
    ('d2000000-0000-4000-8000-000000010092'::uuid, t_farmacia,  'manual'),
    ('d2000000-0000-4000-8000-000000010092'::uuid, t_recompra,  'manual'),
    -- Follow Up (herói)
    ('d2000000-0000-4000-8000-000000010080'::uuid, t_atacado,   'manual'),
    ('d2000000-0000-4000-8000-000000010080'::uuid, t_altovol,   'manual'),
    ('d2000000-0000-4000-8000-000000010080'::uuid, t_quente,    'eva_suggested'),
    ('d2000000-0000-4000-8000-000000010081'::uuid, t_rede,      'manual'),
    ('d2000000-0000-4000-8000-000000010081'::uuid, t_farmacia,  'manual'),
    ('d2000000-0000-4000-8000-000000010081'::uuid, t_altovol,   'manual'),
    ('d2000000-0000-4000-8000-000000010081'::uuid, t_quente,    'eva_suggested'),
    ('d2000000-0000-4000-8000-000000010082'::uuid, t_mercado,   'manual'),
    ('d2000000-0000-4000-8000-000000010082'::uuid, t_altovol,   'manual'),
    ('d2000000-0000-4000-8000-000000010083'::uuid, t_atacado,   'manual'),
    ('d2000000-0000-4000-8000-000000010083'::uuid, t_quente,    'eva_suggested'),
    ('d2000000-0000-4000-8000-000000010085'::uuid, t_atacado,   'manual'),
    ('d2000000-0000-4000-8000-000000010086'::uuid, t_variedade, 'manual'),
    -- Stand By
    ('d2000000-0000-4000-8000-000000010050'::uuid, t_farmacia,  'manual'),
    ('d2000000-0000-4000-8000-000000010050'::uuid, t_altovol,   'manual'),
    ('d2000000-0000-4000-8000-000000010050'::uuid, t_objprec,   'eva_suggested'),
    ('d2000000-0000-4000-8000-000000010051'::uuid, t_variedade, 'manual'),
    -- Qualificação
    ('d2000000-0000-4000-8000-000000010040'::uuid, t_rede,      'manual'),
    ('d2000000-0000-4000-8000-000000010040'::uuid, t_quente,    'eva_suggested'),
    ('d2000000-0000-4000-8000-000000010041'::uuid, t_variedade, 'manual'),
    ('d2000000-0000-4000-8000-000000010042'::uuid, t_farmacia,  'manual'),
    ('d2000000-0000-4000-8000-000000010043'::uuid, t_farmacia,  'manual'),
    -- Proposta
    ('d2000000-0000-4000-8000-000000010070'::uuid, t_variedade, 'manual'),
    ('d2000000-0000-4000-8000-000000010071'::uuid, t_atacado,   'manual'),
    ('d2000000-0000-4000-8000-000000010072'::uuid, t_variedade, 'manual'),
    -- Inativos / Não qualificados
    ('d2000000-0000-4000-8000-000000010010'::uuid, t_farmacia,  'manual'),
    ('d2000000-0000-4000-8000-000000010013'::uuid, t_inadimp,   'manual')
  ) AS x(deal_id, tag_id, src);

  -- ── Previsão de fechamento (expected_close_date) ────────────────────────────
  -- Follow Up: previsão VENCIDA (vermelho no card — prazo estourado)
  UPDATE public.deals SET expected_close_date = (now() - interval '18 days')::date
    WHERE pipeline_id = v_pipe AND stage_id = s_follow;
  -- Stand By: previsão recém-vencida
  UPDATE public.deals SET expected_close_date = (now() - interval '5 days')::date
    WHERE pipeline_id = v_pipe AND stage_id = s_standby;
  -- Qualificação: previsão futura próxima
  UPDATE public.deals SET expected_close_date = (now() + interval '12 days')::date
    WHERE pipeline_id = v_pipe AND stage_id = s_qualif;
  -- Proposta: futura curta
  UPDATE public.deals SET expected_close_date = (now() + interval '6 days')::date
    WHERE pipeline_id = v_pipe AND stage_id = s_prop;
  -- Contato Feito: futura mais longa
  UPDATE public.deals SET expected_close_date = (now() + interval '25 days')::date
    WHERE pipeline_id = v_pipe AND stage_id = s_contato;

  RAISE NOTICE 'DEMO.MSI.RICH aplicada: 10 tags + atribuições + previsões na company %.', v_company;
END
$do$;
