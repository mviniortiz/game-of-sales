-- Prevent cross-company seller assignments on deals.
-- Applies only when user_id/company_id are inserted or changed, so legacy dirty rows
-- can still have stage/value updates until they are cleaned up.

CREATE OR REPLACE FUNCTION public.enforce_deal_assignee_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_company_id uuid;
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT p.company_id
  INTO v_user_company_id
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  IF v_user_company_id IS NULL THEN
    RAISE EXCEPTION 'Deal assignee must have a valid profile/company (user_id=%)', NEW.user_id;
  END IF;

  IF NEW.company_id IS NULL THEN
    NEW.company_id := v_user_company_id;
    RETURN NEW;
  END IF;

  IF NEW.company_id <> v_user_company_id THEN
    RAISE EXCEPTION 'Deal assignee company mismatch (deal.company_id=%, assignee.company_id=%)', NEW.company_id, v_user_company_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_enforce_deal_assignee_company ON public.deals;

CREATE TRIGGER trigger_enforce_deal_assignee_company
BEFORE INSERT OR UPDATE OF user_id, company_id
ON public.deals
FOR EACH ROW
EXECUTE FUNCTION public.enforce_deal_assignee_company();

