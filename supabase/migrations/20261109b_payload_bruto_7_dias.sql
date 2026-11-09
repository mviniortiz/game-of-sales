-- Payload bruto das mensagens só por 7 dias (09/11/2026).
--
-- channel_messages e whatsapp_messages guardam raw_payload, a cópia do evento
-- como chegou do provedor (Whatsmiau, Kapso, Meta). Nenhuma tela, edge ou a
-- Lume lê essa coluna; ela só era gravada. Com média de 3 a 10 KB por mensagem,
-- as duas tabelas chegaram a 543 MB e o banco passou do teto de 500 MB do
-- plano grátis. Texto, mídia, direção e horário da mensagem continuam nas
-- colunas normais; só a cópia bruta sai depois de 7 dias.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261109b_payload_bruto_7_dias.sql

create or replace function public.limpar_payload_bruto(p_dias int default 7, p_lote int default 2000)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_canal int := 0;
    v_legado int := 0;
begin
    update public.channel_messages m
       set raw_payload = null,
           raw_payload_redacted = true
     where m.id in (
         select id from public.channel_messages
          where raw_payload is not null
            and coalesce(message_timestamp, created_at) < now() - make_interval(days => p_dias)
          limit p_lote
     );
    get diagnostics v_canal = row_count;

    update public.whatsapp_messages w
       set raw_payload = null
     where w.id in (
         select id from public.whatsapp_messages
          where raw_payload is not null
            and coalesce(message_timestamp, received_at) < now() - make_interval(days => p_dias)
          limit p_lote
     );
    get diagnostics v_legado = row_count;

    return jsonb_build_object('canal', v_canal, 'legado', v_legado);
end;
$$;

revoke all on function public.limpar_payload_bruto(int, int) from public, anon, authenticated;
grant execute on function public.limpar_payload_bruto(int, int) to service_role;

comment on function public.limpar_payload_bruto is
'Apaga raw_payload das mensagens com mais de p_dias dias, em lotes de p_lote. Cron diário limpa-payload-bruto.';

do $$
begin
    perform cron.unschedule('limpa-payload-bruto');
exception when others then null;
end $$;

-- 05:30 UTC, depois do purge-old-whatsapp-messages (04:00). Lote de 5000 por
-- tabela cobre com folga o volume de um dia.
select cron.schedule(
    'limpa-payload-bruto',
    '30 5 * * *',
    $$select public.limpar_payload_bruto(7, 5000)$$
);
