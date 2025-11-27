-- ============================================
-- AUTOMATIC GOALS CALCULATION TRIGGER
-- ============================================
-- This trigger automatically updates the current_value in metas table
-- when a sale is inserted, updated, or deleted.

-- 1. Add current_value column to metas table if it doesn't exist
ALTER TABLE public.metas 
ADD COLUMN IF NOT EXISTS current_value NUMERIC(12,2) DEFAULT 0;

-- 2. Add current_value column to metas_consolidadas table if it doesn't exist
ALTER TABLE public.metas_consolidadas 
ADD COLUMN IF NOT EXISTS current_value NUMERIC(12,2) DEFAULT 0;

-- 3. Create function to recalculate individual goal progress
CREATE OR REPLACE FUNCTION recalculate_meta_progress()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_sale_date DATE;
  v_month_start DATE;
  v_month_end DATE;
  v_total_value NUMERIC(12,2);
  v_meta_id UUID;
BEGIN
  -- Determine which user and date to use based on operation
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_sale_date := OLD.data_venda::DATE;
  ELSE
    v_user_id := NEW.user_id;
    v_sale_date := NEW.data_venda::DATE;
  END IF;

  -- Calculate month boundaries
  v_month_start := DATE_TRUNC('month', v_sale_date)::DATE;
  v_month_end := (DATE_TRUNC('month', v_sale_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Calculate total approved sales for this user in this month
  SELECT COALESCE(SUM(valor), 0) INTO v_total_value
  FROM public.vendas
  WHERE user_id = v_user_id
    AND status = 'Aprovado'
    AND data_venda >= v_month_start
    AND data_venda <= v_month_end;

  -- Update the meta for this user and month
  UPDATE public.metas
  SET current_value = v_total_value,
      updated_at = NOW()
  WHERE user_id = v_user_id
    AND mes_referencia >= v_month_start
    AND mes_referencia <= v_month_end;

  -- Get the meta_id for logging (optional)
  SELECT id INTO v_meta_id
  FROM public.metas
  WHERE user_id = v_user_id
    AND mes_referencia >= v_month_start
    AND mes_referencia <= v_month_end
  LIMIT 1;

  -- Also update consolidated goals for this month
  PERFORM recalculate_consolidated_meta(v_month_start);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create function to recalculate consolidated goal
CREATE OR REPLACE FUNCTION recalculate_consolidated_meta(p_month_start DATE)
RETURNS VOID AS $$
DECLARE
  v_month_end DATE;
  v_total_value NUMERIC(12,2);
BEGIN
  v_month_end := (p_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

  -- Calculate total approved sales for all users in this month
  SELECT COALESCE(SUM(valor), 0) INTO v_total_value
  FROM public.vendas
  WHERE status = 'Aprovado'
    AND data_venda >= p_month_start
    AND data_venda <= v_month_end;

  -- Update the consolidated meta for this month
  UPDATE public.metas_consolidadas
  SET current_value = v_total_value,
      updated_at = NOW()
  WHERE mes_referencia >= p_month_start
    AND mes_referencia <= v_month_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger on vendas table
DROP TRIGGER IF EXISTS trigger_recalculate_meta ON public.vendas;

CREATE TRIGGER trigger_recalculate_meta
AFTER INSERT OR UPDATE OR DELETE ON public.vendas
FOR EACH ROW
EXECUTE FUNCTION recalculate_meta_progress();

-- 6. Create function to initialize current_value for existing metas
CREATE OR REPLACE FUNCTION initialize_all_metas_current_value()
RETURNS VOID AS $$
DECLARE
  meta_record RECORD;
  v_month_start DATE;
  v_month_end DATE;
  v_total_value NUMERIC(12,2);
BEGIN
  -- Loop through all individual metas
  FOR meta_record IN SELECT id, user_id, mes_referencia FROM public.metas LOOP
    v_month_start := DATE_TRUNC('month', meta_record.mes_referencia)::DATE;
    v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    SELECT COALESCE(SUM(valor), 0) INTO v_total_value
    FROM public.vendas
    WHERE user_id = meta_record.user_id
      AND status = 'Aprovado'
      AND data_venda >= v_month_start
      AND data_venda <= v_month_end;

    UPDATE public.metas
    SET current_value = v_total_value
    WHERE id = meta_record.id;
  END LOOP;

  -- Loop through all consolidated metas
  FOR meta_record IN SELECT id, mes_referencia FROM public.metas_consolidadas LOOP
    v_month_start := DATE_TRUNC('month', meta_record.mes_referencia)::DATE;
    v_month_end := (v_month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE;

    SELECT COALESCE(SUM(valor), 0) INTO v_total_value
    FROM public.vendas
    WHERE status = 'Aprovado'
      AND data_venda >= v_month_start
      AND data_venda <= v_month_end;

    UPDATE public.metas_consolidadas
    SET current_value = v_total_value
    WHERE id = meta_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Run initialization to populate current_value for existing records
SELECT initialize_all_metas_current_value();

-- 8. Add updated_at column if missing
ALTER TABLE public.metas 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.metas_consolidadas 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 9. Grant execute permissions
GRANT EXECUTE ON FUNCTION recalculate_meta_progress() TO authenticated;
GRANT EXECUTE ON FUNCTION recalculate_consolidated_meta(DATE) TO authenticated;

-- Done! Now when any venda is inserted/updated/deleted, the metas.current_value
-- will be automatically updated by the trigger.

