-- O SDR automático manda pitch de agência por email e WhatsApp para todo lead
-- com email + telefone. Leads da landing de validação /orcamento
-- (source = 'orcamento_teste') são donos de negócio pequeno e o contato com
-- eles é manual, pelo Markus. Só o early-return muda; o resto é idêntico a
-- 20260415_sdr_auto_outreach_trigger.sql.
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
        raise warning '[sdr] erro ao disparar outreach: %', sqlerrm;
        return new;
end;
$$;
