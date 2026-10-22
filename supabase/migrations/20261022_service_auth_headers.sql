-- 2026-10-22 — Triggers e cron mandam x-cron-secret para as edges de bastidor.
--
-- As edges sdr-auto-outreach, admin-lead-digest, notify-channel (modo venda) e
-- whatsapp-session-heartbeat passaram a exigir service_role OU x-cron-secret
-- (_shared/serviceAuth.ts). Antes aceitavam qualquer JWT válido, inclusive a
-- anon key do bundle do front.
--
-- O Bearer da service_role nem sempre passa no gateway (ver
-- 20260824_approval_cron.sql), então cada função abaixo manda também o
-- eva_cron_secret do Vault. Só o header muda; o resto é idêntico à última
-- versão de cada função:
--   trigger_sdr_outreach              ← 20260914_sdr_outreach_skip_orcamento.sql
--   trigger_admin_digest              ← 20260419_admin_digest_trigger.sql
--   trigger_notify_channel            ← 20260601_notify_channel_trigger.sql
--   trigger_whatsapp_session_heartbeat ← 20260611_whatsapp_session_heartbeat_cron.sql
--
-- ORDEM: aplicar ESTA migration ANTES de publicar as 4 edges. Header a mais
-- não quebra a edge antiga; edge nova sem o header devolve 401.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261022_service_auth_headers.sql

create or replace function public.trigger_sdr_outreach()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
    v_project_url text;
    v_service_key text;
    v_cron_secret text;
    v_request_id bigint;
begin
    if new.source = 'orcamento_teste' then
        return new;
    end if;

    select decrypted_secret into v_project_url
        from vault.decrypted_secrets
        where name = 'project_url'
        limit 1;

    select decrypted_secret into v_service_key
        from vault.decrypted_secrets
        where name = 'service_role_key'
        limit 1;

    select decrypted_secret into v_cron_secret
        from vault.decrypted_secrets
        where name = 'eva_cron_secret'
        limit 1;

    if v_project_url is null or v_service_key is null then
        raise warning '[sdr] secrets do Vault (project_url/service_role_key) não encontradas; pulando outreach';
        return new;
    end if;

    if new.email is null or new.phone is null then
        return new;
    end if;

    select net.http_post(
        url := v_project_url || '/functions/v1/sdr-auto-outreach',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key,
            'x-cron-secret', coalesce(v_cron_secret, '')
        ),
        body := jsonb_build_object(
            'record', jsonb_build_object(
                'id', new.id,
                'name', new.name,
                'email', new.email,
                'company', new.company,
                'phone', new.phone,
                'source', new.source
            )
        )
    ) into v_request_id;

    return new;
exception
    when others then
        raise warning '[sdr] erro ao disparar outreach: %', sqlerrm;
        return new;
end;
$$;

create or replace function public.trigger_admin_digest()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
    v_project_url text;
    v_service_key text;
    v_cron_secret text;
    v_request_id bigint;
begin
    select decrypted_secret into v_project_url
        from vault.decrypted_secrets
        where name = 'project_url'
        limit 1;

    select decrypted_secret into v_service_key
        from vault.decrypted_secrets
        where name = 'service_role_key'
        limit 1;

    select decrypted_secret into v_cron_secret
        from vault.decrypted_secrets
        where name = 'eva_cron_secret'
        limit 1;

    if v_project_url is null or v_service_key is null then
        raise warning '[admin-digest] vault secrets ausentes; pulando';
        return new;
    end if;

    -- Só dispara se lead tem email (mínimo pra enriquecer)
    if new.email is null then
        return new;
    end if;

    select net.http_post(
        url := v_project_url || '/functions/v1/admin-lead-digest',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key,
            'x-cron-secret', coalesce(v_cron_secret, '')
        ),
        body := jsonb_build_object(
            'record', jsonb_build_object(
                'id', new.id,
                'name', new.name,
                'email', new.email,
                'company', new.company,
                'phone', new.phone,
                'team_size', new.team_size,
                'uses_spreadsheets', new.uses_spreadsheets,
                'biggest_pain', new.biggest_pain,
                'improvement_goal', new.improvement_goal,
                'utm_source', new.utm_source,
                'utm_medium', new.utm_medium,
                'utm_campaign', new.utm_campaign,
                'gclid', new.gclid,
                'fbclid', new.fbclid,
                'source', new.source
            )
        )
    ) into v_request_id;

    return new;
exception
    when others then
        raise warning '[admin-digest] erro: %', sqlerrm;
        return new;
end;
$$;

create or replace function public.trigger_notify_channel()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
    v_project_url text;
    v_service_key text;
    v_cron_secret text;
    v_company_id uuid;
    v_vendedor_nome text;
    v_month_start date;
    v_month_end date;
    v_total_after numeric(12,2);
    v_meta numeric(12,2);
    v_reached boolean := false;
    v_request_id bigint;
begin
    -- Resolve company_id (a venda pode não ter; deriva do perfil do vendedor)
    v_company_id := new.company_id;
    if v_company_id is null then
        select company_id into v_company_id from public.profiles where id = new.user_id;
    end if;
    if v_company_id is null then
        return new;
    end if;

    -- Só segue se a empresa tem ao menos um canal (slack/discord) ativo
    if not exists (
        select 1 from public.integration_configs
        where company_id = v_company_id
          and platform in ('slack', 'discord')
          and is_active = true
    ) then
        return new;
    end if;

    -- Secrets do vault (mesmo padrão dos outros triggers outbound)
    select decrypted_secret into v_project_url from vault.decrypted_secrets where name = 'project_url' limit 1;
    select decrypted_secret into v_service_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;
    select decrypted_secret into v_cron_secret from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;
    if v_project_url is null or v_service_key is null then
        raise warning '[notify-channel] vault secrets ausentes; pulando';
        return new;
    end if;

    -- Nome do vendedor
    select nome into v_vendedor_nome from public.profiles where id = new.user_id;

    -- Total aprovado do vendedor no mês da venda (independente da ordem de triggers)
    v_month_start := date_trunc('month', new.data_venda::date)::date;
    v_month_end := (date_trunc('month', new.data_venda::date) + interval '1 month' - interval '1 day')::date;

    select coalesce(sum(valor), 0) into v_total_after
    from public.vendas
    where user_id = new.user_id
      and status = 'Aprovado'
      and data_venda >= v_month_start
      and data_venda <= v_month_end;

    -- Meta individual do mês: bateu agora se cruzou o limiar com esta venda
    select valor_meta into v_meta
    from public.metas
    where user_id = new.user_id
      and mes_referencia >= v_month_start
      and mes_referencia <= v_month_end
    limit 1;

    if v_meta is not null and v_meta > 0
       and (v_total_after - new.valor) < v_meta
       and v_total_after >= v_meta then
        v_reached := true;
    end if;

    select net.http_post(
        url := v_project_url || '/functions/v1/notify-channel',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key,
            'x-cron-secret', coalesce(v_cron_secret, '')
        ),
        body := jsonb_build_object(
            'company_id', v_company_id,
            'sale', jsonb_build_object(
                'id', new.id,
                'cliente_nome', new.cliente_nome,
                'produto_nome', new.produto_nome,
                'valor', new.valor,
                'user_id', new.user_id,
                'vendedor_nome', v_vendedor_nome
            ),
            'goal', case
                when v_meta is not null then jsonb_build_object(
                    'reached', v_reached,
                    'valor_meta', v_meta,
                    'current_value', v_total_after
                )
                else null
            end
        )
    ) into v_request_id;

    return new;
exception
    when others then
        raise warning '[notify-channel] erro: %', sqlerrm;
        return new;
end;
$$;

CREATE OR REPLACE FUNCTION public.trigger_whatsapp_session_heartbeat()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
    v_anon_key text;
    v_cron_secret text;
    v_request_id bigint;
BEGIN
    SELECT decrypted_secret INTO v_anon_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_anon_key'
    LIMIT 1;

    SELECT decrypted_secret INTO v_cron_secret
    FROM vault.decrypted_secrets
    WHERE name = 'eva_cron_secret'
    LIMIT 1;

    IF v_anon_key IS NULL OR v_cron_secret IS NULL THEN
        RAISE WARNING 'trigger_whatsapp_session_heartbeat: supabase_anon_key/eva_cron_secret not in vault — skipping';
        RETURN NULL;
    END IF;

    SELECT net.http_post(
        url := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/whatsapp-session-heartbeat',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key,
            'x-cron-secret', v_cron_secret
        ),
        body := '{}'::jsonb
    ) INTO v_request_id;

    RETURN v_request_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_whatsapp_session_heartbeat IS
'Reconcilia channel_connections.status com o estado real das sessões Evolution. Chamada via pg_cron a cada 5min. Anon key + eva_cron_secret lidos do Vault.';
