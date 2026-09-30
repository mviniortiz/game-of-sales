-- ─────────────────────────────────────────────────────────────────────────────
-- 20260929b — Funil padrão com nomes de energia solar
--
-- O funil default nasce no primeiro deal da empresa (set_deal_default_pipeline,
-- 20260612_pipelines_foundation). Empresa com companies.segment='energia_solar'
-- (gravado no cadastro via /criar-conta?segmento=energia_solar) ganha os mesmos
-- 6 estágios com títulos do integrador. legacy_key, kind e probabilidade não
-- mudam: deals.stage continua resolvendo o estágio igual para todo mundo.
-- Empresas que já têm funil não são tocadas.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_deal_default_pipeline()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pipeline UUID;
  v_stage    UUID;
  v_solar    BOOLEAN;
BEGIN
  IF NEW.pipeline_id IS NOT NULL AND NEW.stage_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- company pode ainda estar NULL aqui; set_deal_company_id também é BEFORE INSERT,
  -- então derivamos de profiles como fallback para garantir ordem-independência.
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.profiles WHERE id = NEW.user_id;
  END IF;

  IF NEW.company_id IS NULL THEN
    RETURN NEW; -- sem company não há funil; deixa nulo (caso de borda)
  END IF;

  SELECT id INTO v_pipeline FROM public.pipelines
    WHERE company_id = NEW.company_id AND is_default LIMIT 1;

  -- Company sem funil ainda: cria um default on-the-fly com os 6 estágios padrão.
  IF v_pipeline IS NULL THEN
    SELECT coalesce(segment = 'energia_solar', false) INTO v_solar
      FROM public.companies WHERE id = NEW.company_id;

    INSERT INTO public.pipelines (company_id, name, position, is_default)
      VALUES (NEW.company_id, 'Pipeline de Vendas', 0, true)
      RETURNING id INTO v_pipeline;
    INSERT INTO public.pipeline_stages
      (pipeline_id, company_id, title, kind, icon_id, color_id, position, default_probability, legacy_key)
    VALUES
      (v_pipeline, NEW.company_id, CASE WHEN v_solar THEN 'Novo lead'        ELSE 'Lead'         END, 'open', 'target',   'gray',    0, 10,  'lead'),
      (v_pipeline, NEW.company_id, CASE WHEN v_solar THEN 'Visita técnica'   ELSE 'Qualificação' END, 'open', 'users',    'blue',    1, 25,  'qualification'),
      (v_pipeline, NEW.company_id, CASE WHEN v_solar THEN 'Proposta enviada' ELSE 'Proposta'     END, 'open', 'dollar',   'indigo',  2, 55,  'proposal'),
      (v_pipeline, NEW.company_id, 'Negociação',                                                        'open', 'trending', 'amber',   3, 80,  'negotiation'),
      (v_pipeline, NEW.company_id, CASE WHEN v_solar THEN 'Fechado'          ELSE 'Ganho'        END, 'won',  'check',    'emerald', 4, 100, 'closed_won'),
      (v_pipeline, NEW.company_id, 'Perdido',                                                           'lost', 'target',   'gray',    5, 0,   'closed_lost');
  END IF;

  IF NEW.pipeline_id IS NULL THEN
    NEW.pipeline_id := v_pipeline;
  END IF;

  IF NEW.stage_id IS NULL THEN
    SELECT id INTO v_stage FROM public.pipeline_stages
      WHERE pipeline_id = NEW.pipeline_id AND legacy_key = NEW.stage LIMIT 1;
    IF v_stage IS NULL THEN
      SELECT id INTO v_stage FROM public.pipeline_stages
        WHERE pipeline_id = NEW.pipeline_id ORDER BY position LIMIT 1;
    END IF;
    NEW.stage_id := v_stage;
  END IF;

  RETURN NEW;
END;
$$;
