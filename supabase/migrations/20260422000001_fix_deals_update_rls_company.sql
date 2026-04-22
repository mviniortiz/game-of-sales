-- Fix: permitir que qualquer membro da mesma company atualize/deletar/ver deals
-- Motivo: CRM é multi-user por company; restringir a auth.uid() = user_id quebra
-- cenários de equipe (gestor movendo deal de vendedor) e a conta demo.

DROP POLICY IF EXISTS "Users can update their own deals" ON public.deals;
CREATE POLICY "Users can update company deals"
  ON public.deals
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR public.is_super_admin()
    OR company_id = public.get_my_company_id()
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

DROP POLICY IF EXISTS "Users can delete their own deals" ON public.deals;
CREATE POLICY "Users can delete company deals"
  ON public.deals
  FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );

-- SELECT já tem as duas policies (Users + Admins), mas vamos garantir que
-- qualquer membro da mesma company veja os deals — senão o React Query
-- não consegue recarregar a lista após PATCH.
DROP POLICY IF EXISTS "Users can view their own deals" ON public.deals;
CREATE POLICY "Users can view company deals"
  ON public.deals
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_super_admin()
    OR company_id = public.get_my_company_id()
  );
