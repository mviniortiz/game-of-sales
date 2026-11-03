-- Funil do cadastro até o Raio-X pronto, últimos 30 dias, por sessão única.
-- Rodar: npx supabase db query --linked -f scripts/funil-raio-x.sql
-- Mesma sessão do navegador da home ao Raio-X (landing_events.session_id).
with e as (
    select session_id, page, event, coalesce(props->>'step', '') as step
    from public.landing_events
    where created_at > now() - interval '30 days'
      and page in ('signup', 'raio_x')
)
select passo, sessoes from (
    select 1 as ordem, 'cadastro: abriu' as passo, count(distinct session_id) as sessoes from e where page = 'signup' and event = 'view'
    union all select 2, 'cadastro: enviou', count(distinct session_id) from e where page = 'signup' and event = 'form_submit'
    union all select 3, 'raio-x: abriu', count(distinct session_id) from e where page = 'raio_x' and event = 'view'
    union all select 4, 'raio-x: tocou em conectar', count(distinct session_id) from e where page = 'raio_x' and event = 'cta_click' and step = 'conectar'
    union all select 5, 'modal: código ou QR na tela', count(distinct session_id) from e where page = 'raio_x' and event = 'form_submit' and step in ('codigo', 'qr')
    union all select 6, 'modal: conectou', count(distinct session_id) from e where page = 'raio_x' and event = 'form_submit' and step = 'conectado'
    union all select 7, 'raio-x: pronto', count(distinct session_id) from e where page = 'raio_x' and event = 'form_submit' and step = 'pronto'
    union all select 8, 'raio-x: abriu o relatório', count(distinct session_id) from e where page = 'raio_x' and event = 'cta_click' and step = 'ver_relatorio'
    union all select 9, 'desvio: adiou', count(distinct session_id) from e where page = 'raio_x' and event = 'cta_click' and step = 'adiar'
    union all select 10, 'desvio: pediu ajuda', count(distinct session_id) from e where page = 'raio_x' and event = 'whatsapp_click'
    union all select 11, 'desvio: erro na conexão', count(distinct session_id) from e where page = 'raio_x' and event = 'form_error'
) f order by ordem;
