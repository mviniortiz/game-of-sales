-- UNIFY.1 (2026-08-24) — Uma fila de sugestão só.
--
-- Existiam dois caminhos paralelos e incompatíveis:
--   eva_deal_suggestions  ← edge eva-stale-deal-followup (cron de 6h)
--   agent_suggestions     ← edge eva-agent-loop
-- Só o segundo passava pela aprovação por WhatsApp (APPROVAL.1), então tudo que
-- o follow-up de card parado gerava morria numa fila que ninguém abria: medido
-- em 24/08/2026, 59 linhas na tabela legado, 100% 'pending', a mais recente de
-- 10/07/2026.
--
-- Aqui os 59 registros históricos viram agent_suggestions kind='followup' e a
-- tabela legado fica congelada (nenhum código escreve nela depois desta
-- entrega). Como todos passaram MUITO da janela de 48h, entram como 'expired':
-- rascunho de julho não pode ser enviado em agosto.
--
-- Aditiva: não dropa nem altera a tabela legado, só documenta e copia.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260824_unify_suggestions.sql

-- ── 1) Backfill do histórico ────────────────────────────────────────────────
insert into public.agent_suggestions (
    company_id, agent_key, kind, deal_id,
    input_summary, suggestion, status,
    applied_payload, resolved_at, resolved_by, resolved_via, created_at
)
select
    l.company_id,
    'eva',
    'followup',
    l.deal_id,
    jsonb_strip_nulls(jsonb_build_object(
        'channel',       'whatsapp',
        'trigger',       'stale_deal',
        'reason',        l.reason,
        'days_stale',    l.days_stale,
        'sla_context',   l.sla_context,
        'migrated_from', 'eva_deal_suggestions',
        'legacy_id',     l.id::text,
        'legacy_status', l.status
    )),
    jsonb_strip_nulls(jsonb_build_object(
        'channel',         'whatsapp',
        'message_text',    l.message_draft,
        'suggestion_text', l.suggestion_text,
        'contact_name',    d.customer_name,
        'contact_phone',   d.customer_phone
    )),
    -- Tudo que veio de julho está fora da janela de envio. O status honesto é
    -- expirado, não pendente.
    case when l.status = 'pending' then 'expired' else l.status end,
    case when l.final_message is not null
         then jsonb_strip_nulls(jsonb_build_object('text', l.final_message, 'via', l.sent_via))
         else null end,
    coalesce(l.resolved_at, case when l.status = 'pending' then now() else null end),
    l.resolved_by,
    case when l.status = 'pending' then null else 'app' end,
    l.created_at
from public.eva_deal_suggestions l
left join public.deals d on d.id = l.deal_id
where not exists (
    -- Reaplicar a migration não pode duplicar o histórico.
    select 1 from public.agent_suggestions a
    where a.input_summary->>'legacy_id' = l.id::text
);

-- ── 2) Congela a tabela legado ──────────────────────────────────────────────
comment on table public.eva_deal_suggestions is
  'CONGELADA em 2026-08-24 (UNIFY.1). Substituída por agent_suggestions kind=followup, que é a fila única e a única que passa pela aprovação por WhatsApp. Nenhum código escreve aqui: a edge eva-stale-deal-followup foi migrada. Mantida só como backup do backfill; pode ser dropada quando o histórico não for mais necessário.';

do $$
declare
    v_migradas integer;
    v_legado   integer;
begin
    select count(*) into v_migradas from public.agent_suggestions
     where input_summary->>'migrated_from' = 'eva_deal_suggestions';
    select count(*) into v_legado from public.eva_deal_suggestions;
    raise notice 'UNIFY.1: % de % linhas do legado presentes em agent_suggestions.', v_migradas, v_legado;
end $$;
