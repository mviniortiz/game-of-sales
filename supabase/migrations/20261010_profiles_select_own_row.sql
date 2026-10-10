-- Quem acabou de criar a conta ainda não tem empresa (company_id nulo), e
-- "company_id = current_company_id()" nunca é verdadeiro com nulo. Sem ver a
-- própria linha, o AuthContext tratava o perfil como inexistente e deslogava à
-- força no meio do cadastro, antes de onboarding_assign_company: a empresa
-- ficava órfã e a pessoa caía em /auth. A própria linha é sempre legível.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select
  using (id = auth.uid() or company_id = current_company_id() or is_super_admin());
