-- Pedido de Raio-X (source='orcamento_teste') vira card "Raio-X: empresa", com
-- a página e o anúncio de origem nas notas, pra saber qual ângulo trouxe o lead.
CREATE OR REPLACE FUNCTION public.create_deal_from_demo_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
    v_super_admin_id uuid;
    v_title text;
    v_notes text;
    v_deal_id uuid;
begin
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

    v_title := case
        when new.source = 'orcamento_teste'
            then 'Raio-X: ' || coalesce(nullif(new.company, ''), nullif(new.name, ''), new.email)
        else coalesce(nullif(new.company, ''), nullif(new.name, ''), new.email) || ' — Demo agendada'
    end;

    v_notes := 'Lead da landing page (demo_requests.id=' || new.id || ')'
        || E'\nOrigem: ' || coalesce(new.source, 'landing_page')
        || case when new.heard_from is not null then E'\nOnde nos encontrou: ' || new.heard_from else '' end
        || case when new.utm_source is not null
               then E'\nUTM: ' || new.utm_source
                    || coalesce('/' || new.utm_medium, '')
                    || coalesce(' — ' || new.utm_campaign, '')
               else '' end
        || case when new.gclid is not null then E'\ngclid: ' || new.gclid else '' end
        || case when new.fbclid is not null then E'\nfbclid: ' || new.fbclid else '' end
        || case when new.landing_page is not null then E'
Página: ' || new.landing_page else '' end
        || case when new.utm_content is not null then E'
Anúncio: ' || new.utm_content else '' end;

    insert into public.deals (
        title, customer_name, customer_email, customer_phone, stage, user_id, notes
    ) values (
        v_title,
        coalesce(nullif(new.name, ''), 'Lead'),
        new.email,
        new.phone,
        'lead',
        v_super_admin_id,
        v_notes
    )
    returning id into v_deal_id;

    -- link de volta (trigger é de INSERT; este update não re-dispara o deal)
    update public.demo_requests set deal_id = v_deal_id where id = new.id;

    return new;
exception
    when others then
        raise warning '[demo→deal] erro criando deal para %: %', new.email, sqlerrm;
        return new;
end;
$function$;
