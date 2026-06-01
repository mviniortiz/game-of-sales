-- Notify Channel: dispara a edge function notify-channel quando uma venda aprovada é inserida.
-- Posta no Slack/Discord do time (venda fechada + meta batida). A EVA redige a mensagem.
-- Falhas nunca bloqueiam o insert da venda.

create extension if not exists pg_net with schema extensions;

create or replace function public.trigger_notify_channel()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
    v_project_url text;
    v_service_key text;
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
            'Authorization', 'Bearer ' || v_service_key
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

drop trigger if exists trg_notify_channel on public.vendas;

create trigger trg_notify_channel
    after insert on public.vendas
    for each row
    when (new.status = 'Aprovado')
    execute function public.trigger_notify_channel();

comment on function public.trigger_notify_channel() is
    'Dispara edge function notify-channel via pg_net quando uma venda aprovada é inserida e a empresa tem canal Slack/Discord ativo. Notifica venda fechada e meta batida. Falhas não bloqueiam o insert.';
