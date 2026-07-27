-- DEMO.FRESH.1 (2026-07-28) — a conta demo da landing envelhece: o seed de
-- junho abriu com R$ 0 no mês e "atualizada há 31d" (auditoria 27/07). Esta
-- migration cria a rotina que mantém o palco vivo SEM re-seed manual:
--   public.refresh_landing_demo() → desloca os dados pro presente (drift
--   ancorado na última mensagem), rejuvenesce a análise da EVA, empurra
--   previsões de fechamento vencidas e garante a meta do mês corrente.
-- Agendada semanalmente via pg_cron (padrão do repo) + 1 execução imediata.
-- Aplicar com: npx supabase db query --linked -f supabase/migrations/20260728120000_landing_demo_freshness.sql

create or replace function public.refresh_landing_demo()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  c_company constant uuid := '93978642-6a81-44e3-a824-95434a196666';
  v_anchor date;
  v_drift int := 0;
  v_meta_month date := date_trunc('month', now())::date;
begin
  -- Drift: quantos dias os dados ficaram pra trás (âncora = última mensagem;
  -- alvo = ontem, pra nunca criar timestamps no futuro).
  select max(message_timestamp)::date into v_anchor
  from public.channel_messages where company_id = c_company;
  if v_anchor is not null then
    v_drift := (current_date - 1) - v_anchor;
  end if;

  if v_drift > 0 then
    update public.deals
    set created_at = created_at + make_interval(days => v_drift),
        updated_at = updated_at + make_interval(days => v_drift)
    where company_id = c_company;

    update public.channel_conversations
    set created_at = created_at + make_interval(days => v_drift),
        updated_at = updated_at + make_interval(days => v_drift),
        last_message_at = last_message_at + make_interval(days => v_drift),
        last_inbound_at = last_inbound_at + make_interval(days => v_drift),
        last_outbound_at = last_outbound_at + make_interval(days => v_drift)
    where company_id = c_company;

    update public.channel_messages
    set created_at = created_at + make_interval(days => v_drift),
        updated_at = updated_at + make_interval(days => v_drift),
        message_timestamp = message_timestamp + make_interval(days => v_drift)
    where company_id = c_company;
  end if;

  -- Análise da EVA sempre mais nova que a última mensagem (sem badge
  -- "Desatualizada" no palco) e contexto "atualizado há 2 dias".
  update public.conversation_summaries
  set analyzed_at = now() - interval '25 minutes',
      updated_at = now() - interval '25 minutes'
  where company_id = c_company;

  update public.eva_business_context
  set updated_at = now() - interval '2 days'
  where company_id = c_company;

  update public.eva_blueprints
  set updated_at = now() - interval '2 days'
  where company_id = c_company;

  -- Previsão de fechamento nunca vencida (o card mostrava "Venceu 30 jun").
  update public.deals
  set expected_close_date = current_date + ((3 + (abs(hashtext(id::text)) % 12)) || ' days')::interval
  where company_id = c_company
    and expected_close_date is not null
    and expected_close_date < current_date;

  -- Meta do mês corrente ("sem meta cadastrada" no KPI de ganho).
  insert into public.metas_consolidadas (company_id, mes_referencia, valor_meta, descricao)
  select c_company, v_meta_month, 24000, 'Meta do mês'
  where not exists (
    select 1 from public.metas_consolidadas
    where company_id = c_company and mes_referencia = v_meta_month
  );

  return jsonb_build_object('drift_days', v_drift, 'meta_month', v_meta_month, 'ran_at', now());
end;
$$;

-- Função de manutenção interna: só o cron (postgres) e o service_role rodam.
revoke execute on function public.refresh_landing_demo() from public, anon, authenticated;
grant execute on function public.refresh_landing_demo() to service_role;

-- Reagenda de forma idempotente (remove o job antigo se existir, recria).
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname = 'refresh-landing-demo';
exception when others then
  null; -- pg_cron pode não ter o job ainda
end$$;

-- Segundas 06:00 UTC (03:00 BRT): a demo começa a semana com dados de "ontem".
select cron.schedule(
  'refresh-landing-demo',
  '0 6 * * 1',
  $$select public.refresh_landing_demo();$$
);

-- Execução imediata: cobre a meta do mês e qualquer drift acumulado agora.
select public.refresh_landing_demo();
