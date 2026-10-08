-- Raio-X automático (08/10/2026): quem é da empresa do relatório confere o que a
-- EVA achou. Tira o que não é proposta e preenche o valor que o histórico não
-- trouxe (PDF antigo não chega com o conteúdo). Antes só o super admin podia.

create or replace function public.raio_x_can_edit(p_token text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
    select coalesce(public.is_super_admin(), false)
        or exists (
            select 1 from public.raio_x_reports r
            where r.token = p_token and r.company_id = public.get_my_company_id()
        );
$$;
grant execute on function public.raio_x_can_edit(text) to authenticated;

create or replace function public.get_raio_x_report(p_token text)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
    select jsonb_build_object(
        'company_name', r.company_name,
        'created_at', r.created_at,
        'summary', r.summary,
        'items', r.items,
        'can_edit', public.raio_x_can_edit(p_token)
    )
    from public.raio_x_reports r
    where r.token = p_token and length(p_token) >= 24;
$function$;

create or replace function public.raio_x_set_excluded(p_token text, p_index integer, p_excluded boolean)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_items jsonb;
begin
    if not public.raio_x_can_edit(p_token) then
        raise exception 'forbidden' using errcode = '42501';
    end if;

    select items into v_items from public.raio_x_reports where token = p_token for update;
    if v_items is null or p_index < 0 or p_index >= jsonb_array_length(v_items) then
        raise exception 'item não encontrado';
    end if;

    v_items := jsonb_set(v_items, array[p_index::text, 'excluded'], to_jsonb(p_excluded));
    update public.raio_x_reports set items = v_items where token = p_token;
    return v_items;
end;
$function$;

create or replace function public.raio_x_set_amount(p_token text, p_index integer, p_amount numeric)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
    v_items jsonb;
begin
    if not public.raio_x_can_edit(p_token) then
        raise exception 'forbidden' using errcode = '42501';
    end if;
    if p_amount is not null and (p_amount <= 0 or p_amount > 100000000) then
        raise exception 'valor inválido';
    end if;

    select items into v_items from public.raio_x_reports where token = p_token for update;
    if v_items is null or p_index < 0 or p_index >= jsonb_array_length(v_items) then
        raise exception 'item não encontrado';
    end if;

    v_items := jsonb_set(v_items, array[p_index::text, 'amount'], coalesce(to_jsonb(p_amount), 'null'::jsonb));
    v_items := jsonb_set(v_items, array[p_index::text, 'amount_by_owner'], 'true'::jsonb);
    update public.raio_x_reports set items = v_items where token = p_token;
    return v_items;
end;
$function$;
grant execute on function public.raio_x_set_amount(text, integer, numeric) to authenticated;
