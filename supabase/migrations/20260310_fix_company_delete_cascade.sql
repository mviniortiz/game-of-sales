-- ============================================================================
-- FIX: Company deletion fails due to FK constraint on vendas.produto_id
-- Date: 2026-03-10
--
-- Problem:
--   Deleting a company triggers CASCADE on produtos.company_id, which tries
--   to delete produtos rows. But vendas.produto_id references produtos.id
--   WITHOUT a cascade action (default RESTRICT), blocking the delete.
--
-- Solution:
--   1. Alter vendas.produto_id FK to ON DELETE SET NULL (vendas already
--      stores produto_nome, so losing the FK link is safe).
--   2. Create a stored procedure delete_company_cascade() that handles
--      the full deletion in the correct dependency order, wrapped in a
--      transaction for safety.
-- ============================================================================

-- ============================================================================
-- 1. FIX THE FK CONSTRAINT: vendas.produto_id -> produtos.id
--    Change from RESTRICT (default) to SET NULL on delete.
-- ============================================================================

-- Drop the existing constraint (Supabase auto-names it vendas_produto_id_fkey)
ALTER TABLE public.vendas
  DROP CONSTRAINT IF EXISTS vendas_produto_id_fkey;

-- Re-add with ON DELETE SET NULL
ALTER TABLE public.vendas
  ADD CONSTRAINT vendas_produto_id_fkey
  FOREIGN KEY (produto_id) REFERENCES public.produtos(id)
  ON DELETE SET NULL;

-- ============================================================================
-- 2. CREATE RPC: delete_company_cascade
--    Deletes all company data in the correct dependency order.
--    Must be called by a super_admin.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_company_cascade(target_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_name TEXT;
  v_deleted JSONB := '{}'::jsonb;
  v_count INTEGER;
BEGIN
  -- Verify the company exists
  SELECT name INTO v_company_name
  FROM public.companies
  WHERE id = target_company_id;

  IF v_company_name IS NULL THEN
    RAISE EXCEPTION 'Company not found: %', target_company_id;
  END IF;

  -- Verify caller is super_admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_super_admin = true
  ) THEN
    RAISE EXCEPTION 'Only super admins can delete companies';
  END IF;

  -- Step 1: Delete deal_call_insights (depends on deal_calls, deals)
  DELETE FROM public.deal_call_insights WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('deal_call_insights', v_count);

  -- Step 2: Delete deal_calls (depends on deals)
  DELETE FROM public.deal_calls WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('deal_calls', v_count);

  -- Step 3: Delete deal_products (depends on deals AND produtos)
  DELETE FROM public.deal_products WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('deal_products', v_count);

  -- Step 4: Delete deal_activities (depends on deals)
  DELETE FROM public.deal_activities WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('deal_activities', v_count);

  -- Step 5: Delete deal_notes (depends on deals)
  DELETE FROM public.deal_notes WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('deal_notes', v_count);

  -- Step 6: Delete deals
  DELETE FROM public.deals WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('deals', v_count);

  -- Step 7: Nullify produto_id in vendas before deleting produtos
  UPDATE public.vendas
  SET produto_id = NULL
  WHERE company_id = target_company_id
    AND produto_id IS NOT NULL;

  -- Step 8: Delete vendas
  DELETE FROM public.vendas WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('vendas', v_count);

  -- Step 9: Delete produtos
  DELETE FROM public.produtos WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('produtos', v_count);

  -- Step 10: Delete metas
  DELETE FROM public.metas WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('metas', v_count);

  -- Step 11: Delete metas_consolidadas
  DELETE FROM public.metas_consolidadas WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('metas_consolidadas', v_count);

  -- Step 12: Delete agendamentos
  DELETE FROM public.agendamentos WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('agendamentos', v_count);

  -- Step 13: Delete calls (ligações avulsas)
  DELETE FROM public.calls WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('calls', v_count);

  -- Step 14: Delete integration_configs
  DELETE FROM public.integration_configs WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('integration_configs', v_count);

  -- Step 15: Delete webhook_logs
  DELETE FROM public.webhook_logs WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('webhook_logs', v_count);

  -- Step 16: Delete company_addons
  DELETE FROM public.company_addons WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('company_addons', v_count);

  -- Step 17: Detach profiles (set company_id to NULL so auth.users isn't affected)
  UPDATE public.profiles
  SET company_id = NULL
  WHERE company_id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('profiles_detached', v_count);

  -- Step 18: Delete the company itself
  DELETE FROM public.companies WHERE id = target_company_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('companies', v_count);

  v_deleted := v_deleted || jsonb_build_object('company_name', v_company_name);

  RETURN v_deleted;
END;
$$;

-- Grant execute to authenticated users (the function itself checks for super_admin)
GRANT EXECUTE ON FUNCTION public.delete_company_cascade(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_company_cascade(UUID) TO service_role;

-- ============================================================================
SELECT 'Migration complete: FK fix + delete_company_cascade function created' AS resultado;
