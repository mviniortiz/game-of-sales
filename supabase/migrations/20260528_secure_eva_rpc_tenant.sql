-- ============================================================
-- Segurança: isolamento de tenant nas RPCs SECURITY DEFINER da Eva
-- ------------------------------------------------------------
-- Problema: eva_smart_insert_memory / eva_touch_memories eram SECURITY DEFINER
-- com EXECUTE para PUBLIC/authenticated e aceitavam company_id por parâmetro
-- sem validar pertencimento. Um usuário autenticado podia chamar via PostgREST
-- passando o company_id de OUTRA empresa e gravar/tocar memória cross-tenant
-- (poluição de dados + injeção de contexto na Eva do outro tenant).
--
-- Correção (defense-in-depth):
--   1) Revoga EXECUTE de PUBLIC/anon/authenticated; só service_role chama
--      (as edge functions usam service_role). Nenhum caminho do frontend usa.
--   2) Recria as funções validando pertencimento para chamadas não-service_role,
--      caso o EXECUTE seja reconcedido no futuro.
-- ============================================================

-- 1) eva_smart_insert_memory: valida que o chamador pertence à company alvo
CREATE OR REPLACE FUNCTION public.eva_smart_insert_memory(
  p_company_id uuid,
  p_user_id uuid,
  p_type text,
  p_content text,
  p_source text DEFAULT 'auto_learned'::text,
  p_confidence numeric DEFAULT 0.5,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_existing_id UUID;
  v_content_key TEXT;
  v_result_id UUID;
BEGIN
  -- Isolamento de tenant: chamadas autenticadas só gravam na própria empresa.
  -- service_role (edge functions) e super_admin passam livres.
  IF coalesce(auth.role(), '') <> 'service_role' AND NOT public.is_super_admin() THEN
    IF auth.uid() IS NULL
       OR NOT EXISTS (
         SELECT 1 FROM public.profiles
         WHERE id = auth.uid() AND company_id = p_company_id
       ) THEN
      RAISE EXCEPTION 'forbidden: caller does not belong to company %', p_company_id
        USING ERRCODE = '42501';
    END IF;
  END IF;

  v_content_key := lower(regexp_replace(substring(p_content, 1, 50), '\s+', ' ', 'g'));

  SELECT id INTO v_existing_id
  FROM public.eva_memory
  WHERE company_id = p_company_id
    AND (
      (p_user_id IS NULL AND user_id IS NULL) OR
      (p_user_id IS NOT NULL AND user_id = p_user_id)
    )
    AND type = p_type
    AND lower(regexp_replace(substring(content, 1, 50), '\s+', ' ', 'g')) = v_content_key
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    UPDATE public.eva_memory
    SET
      confidence = LEAST(1.0, confidence + 0.05),
      usage_count = usage_count + 1,
      last_used_at = now()
    WHERE id = v_existing_id;
    v_result_id := v_existing_id;
  ELSE
    INSERT INTO public.eva_memory (
      company_id, user_id, type, content, source, confidence, metadata,
      usage_count, last_used_at
    )
    VALUES (
      p_company_id, p_user_id, p_type, p_content, p_source, p_confidence, p_metadata,
      1, now()
    )
    RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$function$;

-- 2) eva_touch_memories: chamadas autenticadas só tocam memórias da própria company
CREATE OR REPLACE FUNCTION public.eva_touch_memories(p_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF coalesce(auth.role(), '') = 'service_role' OR public.is_super_admin() THEN
    UPDATE public.eva_memory
       SET usage_count = usage_count + 1,
           last_used_at = now()
     WHERE id = ANY(p_ids);
  ELSE
    UPDATE public.eva_memory
       SET usage_count = usage_count + 1,
           last_used_at = now()
     WHERE id = ANY(p_ids)
       AND company_id = public.get_my_company_id();
  END IF;
END;
$function$;

-- 3) Reduz a superfície: só service_role pode executar diretamente
REVOKE EXECUTE ON FUNCTION public.eva_smart_insert_memory(uuid,uuid,text,text,text,numeric,jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.eva_smart_insert_memory(uuid,uuid,text,text,text,numeric,jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.eva_smart_insert_memory(uuid,uuid,text,text,text,numeric,jsonb) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.eva_smart_insert_memory(uuid,uuid,text,text,text,numeric,jsonb) TO service_role;

REVOKE EXECUTE ON FUNCTION public.eva_touch_memories(uuid[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.eva_touch_memories(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.eva_touch_memories(uuid[]) FROM authenticated;
GRANT  EXECUTE ON FUNCTION public.eva_touch_memories(uuid[]) TO service_role;
