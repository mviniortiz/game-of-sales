-- O metadata do signUp vem do navegador: sem esta trava, qualquer pessoa podia
-- se cadastrar mandando o company_id de outra empresa e entrar nela como admin.
-- Mesma regra do onboarding_assign_company: só vale empresa recém-criada, sem
-- membros (cadastro, demos e clones sempre caem nesse caso).
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    _company_id UUID;
    _role app_role;
BEGIN
    _company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;

    IF _company_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles WHERE company_id = _company_id AND id <> NEW.id
    ) THEN
        _company_id := NULL;
    END IF;

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
      company_id = COALESCE(profiles.company_id, EXCLUDED.company_id);

    IF _company_id IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, _role)
      ON CONFLICT DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$;
