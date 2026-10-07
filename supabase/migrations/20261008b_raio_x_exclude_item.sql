-- "Não é proposta": no Raio-X, todo PDF enviado conta como proposta (mesma regra
-- do placar), e o histórico não traz o conteúdo do arquivo. Na conversa, o Markus
-- tira o que não é proposta e a soma da página se refaz em cima dos itens.

create or replace function public.raio_x_set_excluded(p_token text, p_index int, p_excluded boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_items jsonb;
begin
    if not public.is_super_admin() then
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
$$;

revoke all on function public.raio_x_set_excluded(text, int, boolean) from public;
grant execute on function public.raio_x_set_excluded(text, int, boolean) to authenticated;
