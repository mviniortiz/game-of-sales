-- section_view: qual seção da página apareceu na tela (props.secao). Mostra em que
-- ponto da home quem chega do anúncio desiste; scroll_50/90 só dizia que 9 em 10
-- não passam da metade.
create or replace function public.log_landing_event(payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_event text := left(coalesce(payload->>'event', ''), 40);
    v_session text := left(coalesce(payload->>'session_id', ''), 64);
    v_page text := left(coalesce(payload->>'page', ''), 80);
    v_props jsonb := coalesce(payload->'props', '{}'::jsonb);
begin
    if v_event not in ('view', 'scroll_50', 'scroll_90', 'cta_click', 'form_start', 'form_submit', 'form_error', 'whatsapp_click', 'section_view')
       or v_session = '' or v_page = '' then
        return;
    end if;
    if jsonb_typeof(v_props) <> 'object' or length(v_props::text) > 2000 then
        v_props := '{}'::jsonb;
    end if;
    -- Teto por sessão: evita que um script encha a tabela.
    if (select count(*) from public.landing_events where session_id = v_session) >= 60 then
        return;
    end if;

    insert into public.landing_events
        (session_id, event, page, variant, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, referrer, props)
    values (
        v_session, v_event, v_page,
        left(payload->>'variant', 40),
        left(payload->>'utm_source', 120), left(payload->>'utm_medium', 120),
        left(payload->>'utm_campaign', 200), left(payload->>'utm_content', 200),
        left(payload->>'utm_term', 200), left(payload->>'fbclid', 300),
        left(payload->>'referrer', 300), v_props
    );
end;
$$;

revoke all on function public.log_landing_event(jsonb) from public;
grant execute on function public.log_landing_event(jsonb) to anon, authenticated;
