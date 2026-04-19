-- Admin Lead Digest: dispara edge function admin-lead-digest quando novo lead é inserido
-- Envia WhatsApp pro admin com resumo enriquecido + cria conta demo automaticamente

create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_admin_digest()
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
    select decrypted_secret into v_project_url
        from vault.decrypted_secrets
        where name = 'project_url'
        limit 1;

    select decrypted_secret into v_service_key
        from vault.decrypted_secrets
        where name = 'service_role_key'
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
            'Authorization', 'Bearer ' || v_service_key
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

drop trigger if exists trg_admin_lead_digest on public.demo_requests;

create trigger trg_admin_lead_digest
    after insert on public.demo_requests
    for each row
    execute function public.trigger_admin_digest();

comment on function public.trigger_admin_digest() is
    'Dispara edge function admin-lead-digest via pg_net quando um novo demo_request é criado. Envia WhatsApp resumido pro admin + cria conta demo. Falhas não bloqueiam insert.';
