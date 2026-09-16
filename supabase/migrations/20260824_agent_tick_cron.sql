-- VYZON.AGENTS.4 (2026-08-24) — Ligar o loop da EVA.
--
-- Medido em 2026-08-24: agent_runs = 0. O nucleo agentico existia desde
-- 2026-08-21 e nunca tinha rodado, porque ninguem chamava a edge
-- eva-agent-loop: nem front, nem cron, nem webhook. Um agente que so roda com
-- curl manual nao e um agente.
--
-- Este tick escolhe os cards parados de cada empresa com WhatsApp ativo e roda
-- o loop uma vez por card. O que a EVA faz sozinha continua sendo interno
-- (abrir card, mover estagio, agendar retomada, registrar atividade). Se ela
-- decidir falar com o lead, sai rascunho para aprovacao, nunca mensagem.
--
-- Teto por rodada: 3 cards por empresa, uma vez por dia util. Isso segura o
-- custo de LLM enquanto a base e pequena; quando houver uso real, subir a
-- frequencia e um numero, nao uma reescrita.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260824_agent_tick_cron.sql

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.trigger_eva_agent_tick(p_max_per_company integer default 3)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
    v_url         text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/eva-agent-loop';
    v_cron_secret text;
    v_anon_key    text;
    v_company     record;
    v_deal        record;
    v_disparos    integer := 0;
begin
    select decrypted_secret into v_cron_secret
    from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;

    select decrypted_secret into v_anon_key
    from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;

    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_eva_agent_tick: segredo ausente no vault, pulando';
        return 0;
    end if;

    -- Só empresa com WhatsApp de pé: sem canal ativo a EVA não tem o que ler
    -- nem por onde pedir aprovação.
    for v_company in
        select c.id
        from companies c
        where exists (
            select 1 from channel_connections cc
            where cc.company_id = c.id
              and cc.provider = 'evolution'
              and cc.status = 'active'
        )
    loop
        for v_deal in
            select d.id
            from deals d
            where d.company_id = v_company.id
              and d.stage not in ('closed_won', 'closed_lost')
              and d.updated_at < now() - interval '3 days'
            order by d.updated_at asc
            limit p_max_per_company
        loop
            perform net.http_post(
                url := v_url,
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || v_anon_key,
                    'x-cron-secret', v_cron_secret
                ),
                body := jsonb_build_object(
                    'company_id', v_company.id,
                    'deal_id', v_deal.id,
                    'goal', 'Este card esta parado. Leia o contexto e o resumo da conversa, decida o proximo passo e execute o que for interno. Se o certo for falar com o lead, rascunhe a mensagem para aprovacao.'
                ),
                timeout_milliseconds := 60000
            );
            v_disparos := v_disparos + 1;
        end loop;
    end loop;

    return v_disparos;
end;
$$;

comment on function public.trigger_eva_agent_tick is
'VYZON.AGENTS.4: roda o eva-agent-loop nos cards parados de cada empresa com WhatsApp ativo. Teto de p_max_per_company cards por empresa por rodada.';

do $$
begin
    perform cron.unschedule('eva-agent-tick');
exception when others then null;
end $$;

-- 12h UTC = 9h de Brasilia, dias uteis: o rascunho chega quando o dono esta
-- comecando o dia, nao de madrugada.
select cron.schedule(
    'eva-agent-tick',
    '0 12 * * 1-5',
    $$ select public.trigger_eva_agent_tick(3); $$
);
