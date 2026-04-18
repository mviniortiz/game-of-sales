-- Demo Request → Deal automation
-- Quando um lead preenche o form de agendamento na landing, cria
-- automaticamente um deal no stage "lead" (titulo de UI pode ser "Caiu Lead")
-- atribuído ao super_admin. company_id é auto-setado pelo trigger
-- set_deal_company_id existente.

create or replace function public.create_deal_from_demo_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    v_super_admin_id uuid;
    v_title text;
    v_notes text;
begin
    -- Localiza o super_admin (dono da conta Vyzon) pra atribuir o deal.
    -- Usa o primeiro profile com is_super_admin = true (ordenado por criação).
    select id
        into v_super_admin_id
        from public.profiles
        where is_super_admin = true
        order by created_at asc
        limit 1;

    if v_super_admin_id is null then
        raise warning '[demo→deal] nenhum super_admin encontrado; pulando criação de deal para %', new.email;
        return new;
    end if;

    -- Título amigável: "<empresa> — Demo agendada" ou "<nome> — Demo agendada" ou fallback p/ email
    v_title := coalesce(nullif(new.company, ''), nullif(new.name, ''), new.email) || ' — Demo agendada';

    -- Notas com atribuição pra rastreio de campanha
    v_notes := 'Lead da landing page (demo_requests.id=' || new.id || ')'
        || E'\nOrigem: ' || coalesce(new.source, 'landing_page')
        || case when new.utm_source is not null
               then E'\nUTM: ' || new.utm_source
                    || coalesce('/' || new.utm_medium, '')
                    || coalesce(' — ' || new.utm_campaign, '')
               else '' end
        || case when new.gclid is not null
               then E'\ngclid: ' || new.gclid
               else '' end
        || case when new.fbclid is not null
               then E'\nfbclid: ' || new.fbclid
               else '' end;

    insert into public.deals (
        title,
        customer_name,
        customer_email,
        customer_phone,
        stage,
        user_id,
        notes
    ) values (
        v_title,
        coalesce(nullif(new.name, ''), 'Lead'),
        new.email,
        new.phone,
        'lead',
        v_super_admin_id,
        v_notes
    );

    return new;
exception
    when others then
        -- Falha no deal NUNCA bloqueia o insert do demo_request
        raise warning '[demo→deal] erro criando deal para %: %', new.email, sqlerrm;
        return new;
end;
$$;

-- Idempotência
drop trigger if exists trg_create_deal_from_demo on public.demo_requests;

create trigger trg_create_deal_from_demo
    after insert on public.demo_requests
    for each row
    execute function public.create_deal_from_demo_request();

comment on function public.create_deal_from_demo_request() is
    'Cria deal no stage "lead" atribuído ao super_admin a partir de um novo demo_request. Falhas são logadas como warning e NUNCA bloqueiam o insert.';
