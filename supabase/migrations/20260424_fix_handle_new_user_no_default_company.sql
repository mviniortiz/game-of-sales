-- ════════════════════════════════════════════════════════════════════════
-- BUG FIX CRÍTICO: trigger handle_new_user tinha default company_id =
-- '00000000-0000-0000-0000-000000000001' (Vyzon) quando user_metadata não
-- incluía company_id. Efeito: todo user novo via SSO Google entrava como
-- admin dentro da company Vyzon, enxergando dados sensíveis.
--
-- Fix: se metadata não tem company_id, profile é criado com company_id=NULL.
-- ProtectedRoute detecta e redireciona pro /onboarding pra completar setup.
-- ════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _company_id UUID;
    _role app_role;
BEGIN
    -- Company vem do metadata do signup explícito (via /onboarding email+senha).
    -- Se vazio (ex: SSO Google que não passa metadata), deixa NULL → user vai
    -- pro onboarding finalizar setup (ProtectedRoute redireciona).
    _company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;

    _role := COALESCE(
      (NEW.raw_user_meta_data->>'role')::app_role,
      'admin'
    );

    INSERT INTO public.profiles (id, nome, email, company_id)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      _company_id
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      -- Mantém company_id existente se já estava setado (evita downgrade).
      -- Só atualiza se for NULL no profile atual (primeiro signup).
      company_id = COALESCE(profiles.company_id, EXCLUDED.company_id);

    -- Role só vai em user_roles se tiver company_id (pra manter integridade)
    IF _company_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, _role)
      ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user IS
'Cria profile quando user novo aparece em auth.users. Se metadata não traz company_id (caso SSO), deixa NULL — ProtectedRoute redireciona pro /onboarding pra completar setup.';
