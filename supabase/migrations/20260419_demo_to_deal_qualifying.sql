-- Atualiza trigger demo_request → deal pra incluir:
-- 1. Empresa no título do deal (fallback pra nome/email)
-- 2. Dados de qualificação do wizard step 2 nas notas (team_size, planilhas, dor, meta)
-- 3. Atribuição UTM/gclid/fbclid preservada

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
    v_uses_spreadsheets_label text;
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

    v_title := coalesce(nullif(new.company, ''), nullif(new.name, ''), new.email) || ' — Demo agendada';

    v_uses_spreadsheets_label := case
        when new.uses_spreadsheets is true then 'Sim, ainda usam planilhas'
        when new.uses_spreadsheets is false then 'Não, já usam CRM'
        else null
    end;

    v_notes := '📋 Lead da landing (demo_requests.id=' || new.id || ')'
        || E'\n\n── Contato ──'
        || E'\n• Nome: ' || coalesce(nullif(new.name, ''), '—')
        || E'\n• Email: ' || new.email
        || E'\n• WhatsApp: ' || coalesce(nullif(new.phone, ''), '—')
        || E'\n• Empresa: ' || coalesce(nullif(new.company, ''), '—')
        || case when new.team_size is not null or new.uses_spreadsheets is not null
                  or new.biggest_pain is not null or new.improvement_goal is not null
                then E'\n\n── Qualificação ──'
                    || case when new.team_size is not null
                            then E'\n• Tamanho do time: ' || new.team_size || ' vendedores'
                            else '' end
                    || case when v_uses_spreadsheets_label is not null
                            then E'\n• Usa planilhas: ' || v_uses_spreadsheets_label
                            else '' end
                    || case when new.biggest_pain is not null
                            then E'\n• Maior dor: ' || new.biggest_pain
                            else '' end
                    || case when new.improvement_goal is not null
                            then E'\n• Quer melhorar: ' || new.improvement_goal
                            else '' end
                else '' end
        || case when new.utm_source is not null or new.gclid is not null or new.fbclid is not null
                then E'\n\n── Atribuição ──'
                    || case when new.utm_source is not null
                            then E'\n• UTM: ' || new.utm_source
                                || coalesce('/' || new.utm_medium, '')
                                || coalesce(' — ' || new.utm_campaign, '')
                            else '' end
                    || case when new.gclid is not null
                            then E'\n• gclid: ' || new.gclid
                            else '' end
                    || case when new.fbclid is not null
                            then E'\n• fbclid: ' || new.fbclid
                            else '' end
                else '' end
        || E'\n• Origem: ' || coalesce(new.source, 'landing_page');

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
        raise warning '[demo→deal] erro criando deal para %: %', new.email, sqlerrm;
        return new;
end;
$$;

comment on function public.create_deal_from_demo_request() is
    'Cria deal no stage lead a partir de demo_request. Inclui contato, qualificação (team_size/planilhas/dor/meta) e UTM nas notas. Falhas são warning e não bloqueiam o insert.';
