-- APPROVAL.1 (2026-08-24) — Rascunho pendente tem prazo de validade.
--
-- Medido em 2026-08-24: 162 de 175 agent_suggestions estavam 'pending', várias
-- com semanas de idade. Um follow-up escrito há três semanas não deve ser
-- enviado hoje: o contexto da conversa já mudou. Sem esta limpeza, a primeira
-- rodada do cron de aprovação viraria um disparo em massa.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260824_expire_stale_suggestions.sql

create or replace function public.expire_stale_agent_suggestions(p_max_age_hours integer default 48)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    v_count integer;
begin
    update public.agent_suggestions
       set status        = 'expired',
           resolved_at   = now(),
           approval_code = null
     where status = 'pending'
       and created_at < now() - make_interval(hours => p_max_age_hours);

    get diagnostics v_count = row_count;
    return v_count;
end;
$$;

comment on function public.expire_stale_agent_suggestions is
'APPROVAL.1: fecha rascunhos pendentes velhos demais para serem enviados. Chamada pelo cron eva-approval-notify antes de cada rodada.';

revoke all on function public.expire_stale_agent_suggestions(integer) from public;
grant execute on function public.expire_stale_agent_suggestions(integer) to service_role;

-- Backfill: limpa a fila herdada antes de ligar a notificação.
do $$
declare
    v_expired integer;
begin
    select public.expire_stale_agent_suggestions(48) into v_expired;
    raise notice 'APPROVAL.1: % sugestoes pendentes antigas marcadas como expired.', v_expired;
end $$;
