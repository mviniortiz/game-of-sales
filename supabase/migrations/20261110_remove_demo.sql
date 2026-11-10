-- Fim da demo (10/11/2026). As empresas de demonstração (Vyzon Demo, Agência
-- Metria Growth, Incorporadora Aurora) foram apagadas, junto com /embed-demo,
-- o formulário antigo de agendar demo (DemoScheduleSection) e as edges
-- demo-session, create-personalized-demo e generate-demo-agent.
--
-- Sai: o cron semanal que atualizava a demo da landing e as funções que só a
-- demo usava. Fica: a tabela demo_requests e seus gatilhos, que o formulário
-- /escala (submit_escala_request) ainda usa.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261110_remove_demo.sql

do $$
begin
    perform cron.unschedule('refresh-landing-demo');
exception when others then null;
end $$;

drop function if exists public.refresh_landing_demo();
drop function if exists public.clone_demo_environment(uuid, text, text);
drop function if exists public.delete_demo_environment(uuid);
drop function if exists public.submit_demo_request(jsonb);
drop function if exists public.submit_demo_intake(jsonb);
drop function if exists public.complete_demo_request(uuid, jsonb);
drop function if exists public.attach_demo_site_context(uuid, jsonb);
drop function if exists public._diag_rls_demo();
