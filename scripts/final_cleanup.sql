-- Limpa o que sobrou de testes: deals, demo_requests, activities, notes
do $$
declare
    v_deals int; v_demo int; v_activities int; v_notes int;
begin
    delete from public.deal_activities;
    get diagnostics v_activities = row_count;
    delete from public.deal_notes;
    get diagnostics v_notes = row_count;
    delete from public.deals;
    get diagnostics v_deals = row_count;
    delete from public.demo_requests;
    get diagnostics v_demo = row_count;
    raise notice '[cleanup] deals=% demo=% activities=% notes=%',
        v_deals, v_demo, v_activities, v_notes;
end $$;

select
    (select count(*) from public.deals) as deals_left,
    (select count(*) from public.demo_requests) as demo_requests_left,
    (select count(*) from public.deal_activities) as activities_left,
    (select count(*) from public.deal_notes) as notes_left,
    (select count(*) from public.companies) as companies_left,
    (select count(*) from public.profiles) as profiles_left;
