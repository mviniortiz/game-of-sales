-- LEARN.1 (2026-08-24) — A EVA se calibra sozinha, uma vez por semana.
--
-- Medido em 24/08/2026: 3 de 30 empresas tinham contexto preenchido. O
-- formulário nunca vai ser preenchido pela maioria, então quem passa a
-- preencher é a EVA, lendo as conversas que já existem.
--
-- Só roda para empresa com material real (3 resumos de conversa no mínimo) e
-- que não tenha fila de sugestão de conversa esperando decisão: repropor por
-- cima do que já está pendente só empilha trabalho para o humano.
--
-- Semanal, porque contexto de negócio muda devagar e cada rodada custa uma
-- chamada de LLM por empresa.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260824_learn_context_cron.sql

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_eva_learn_context()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_url         text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/eva-learn-from-conversations';
    v_cron_secret text;
    v_anon_key    text;
    v_company     record;
    v_disparos    integer := 0;
begin
    select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;

    select decrypted_secret into v_anon_key
    from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;

    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_eva_learn_context: segredo ausente no vault, pulando';
        return 0;
    end if;

    for v_company in
        select cs.company_id
        from public.conversation_summaries cs
        group by cs.company_id
        having count(*) >= 3
    loop
        -- Fila de conversa ainda aberta significa que o humano nem olhou a
        -- rodada anterior. Propor mais é ruído.
        if exists (
            select 1 from public.eva_context_suggestions s
            where s.company_id = v_company.company_id
              and s.source = 'conversations'
              and s.status = 'pending'
        ) then
            continue;
        end if;

        perform net.http_post(
            url := v_url,
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || v_anon_key,
                'x-cron-secret', v_cron_secret
            ),
            body := jsonb_build_object('company_id', v_company.company_id, 'limit', 25),
            timeout_milliseconds := 120000
        );
        v_disparos := v_disparos + 1;
    end loop;

    return v_disparos;
end;
$$;

comment on function public.trigger_eva_learn_context is
'LEARN.1: faz a EVA deduzir o contexto do negócio das conversas de cada empresa com material suficiente. Pula quem já tem sugestão de conversa pendente.';

do $$
begin
    perform cron.unschedule('eva-learn-context');
exception when others then null;
end $$;

-- Segunda, 13h UTC (10h de Brasília): a semana começa com a EVA propondo o que
-- entendeu do negócio.
select cron.schedule(
    'eva-learn-context',
    '0 13 * * 1',
    $$ select public.trigger_eva_learn_context(); $$
);
