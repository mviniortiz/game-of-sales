-- SDR Auto-Outreach: dispara edge function sdr-auto-outreach quando novo lead é inserido
-- Usa pg_net (HTTP assíncrono) + vault.decrypted_secrets para obter credenciais

-- Garantir extensões necessárias
create extension if not exists pg_net with schema extensions;

-- Função que dispara o webhook para a edge function
-- Lê project_url e service_role_key do Vault (criados previamente via vault.create_secret)
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
    -- Lê secrets do Vault (requer permissão: security definer executa como owner)
    select decrypted_secret into v_project_url
        from vault.decrypted_secrets
        where name = 'project_url'
        limit 1;

    select decrypted_secret into v_service_key
        from vault.decrypted_secrets
        where name = 'service_role_key'
        limit 1;

    -- Se vault não tem as secrets, faz noop silencioso (evita travar insert)
    if v_project_url is null or v_service_key is null then
        raise warning '[sdr] secrets do Vault (project_url/service_role_key) não encontradas; pulando outreach';
        return new;
    end if;

    -- Só dispara se email e telefone estão presentes
    if new.email is null or new.phone is null then
        return new;
    end if;

    -- Dispara chamada HTTP assíncrona (não bloqueia o insert)
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
                'source', new.source
            )
        )
    ) into v_request_id;

    return new;
exception
    when others then
        -- Nunca falhar o insert por causa do webhook
        raise warning '[sdr] erro ao disparar outreach: %', sqlerrm;
        return new;
end;
$$;

-- Permissão para a função acessar vault (security definer já dá acesso como owner)
grant usage on schema vault to postgres;

-- Remove trigger antigo se existir (idempotência)
drop trigger if exists trg_sdr_auto_outreach on public.demo_requests;

-- Cria o trigger: dispara após insert de novo demo_request
create trigger trg_sdr_auto_outreach
    after insert on public.demo_requests
    for each row
    execute function public.trigger_sdr_outreach();

comment on function public.trigger_sdr_outreach() is
    'Dispara edge function sdr-auto-outreach via pg_net quando um novo demo_request é criado. Lê credenciais do vault.decrypted_secrets. Falhas no webhook não bloqueiam o insert.';
