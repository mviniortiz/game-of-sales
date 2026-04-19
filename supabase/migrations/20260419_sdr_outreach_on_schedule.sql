-- SDR Auto-Outreach: agora dispara quando scheduled_at é setado
-- (em vez de no insert cru). Assim a mensagem sempre inclui data + link do Meet.

create or replace function public.trigger_sdr_outreach()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
    v_project_url text;
    v_service_key text;
    v_request_id bigint;
begin
    -- Só dispara quando o lead tem scheduled_at
    if new.scheduled_at is null then
        return new;
    end if;

    -- Em updates, só quando scheduled_at passou de null pra not null
    -- (evita re-envio em updates subsequentes como mudanças de status)
    if tg_op = 'UPDATE' and old.scheduled_at is not null then
        return new;
    end if;

    if new.email is null or new.phone is null then
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

    if v_project_url is null or v_service_key is null then
        raise warning '[sdr] secrets do Vault ausentes; pulando outreach';
        return new;
    end if;

    select net.http_post(
        url := v_project_url || '/functions/v1/sdr-auto-outreach',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_service_key
        ),
        body := jsonb_build_object(
            'record', jsonb_build_object(
                'id', new.id,
                'name', new.name,
                'email', new.email,
                'company', new.company,
                'phone', new.phone,
                'source', new.source,
                'scheduled_at', new.scheduled_at,
                'google_meet_link', new.google_meet_link,
                'team_size', new.team_size,
                'uses_spreadsheets', new.uses_spreadsheets,
                'biggest_pain', new.biggest_pain,
                'improvement_goal', new.improvement_goal
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

-- Substitui trigger antigo (que disparava no insert)
drop trigger if exists trg_sdr_auto_outreach on public.demo_requests;

create trigger trg_sdr_auto_outreach
    after insert or update of scheduled_at on public.demo_requests
    for each row
    execute function public.trigger_sdr_outreach();

comment on function public.trigger_sdr_outreach() is
    'Dispara edge function sdr-auto-outreach quando demo_request tem scheduled_at setado (via insert ou update). Inclui dados da reunião + campos qualificantes no payload.';
