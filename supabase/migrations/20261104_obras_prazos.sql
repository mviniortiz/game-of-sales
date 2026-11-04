-- Obras: prazo por etapa e aviso no WhatsApp (04/11/2026)
--
-- Até aqui a obra contava como travada com 5 dias em qualquer etapa. Agora cada
-- empresa diz quantos dias espera em cada etapa (obra_prazos; o padrão é sugestão,
-- não prazo da concessionária). Passou disso, a edge pos-venda-aviso avisa o dono
-- no WhatsApp em dia útil às 9h, uma vez por etapa (avisado_em), de novo só depois
-- de 7 dias. É aviso interno: nada sai para o cliente.
-- Aditiva: tabela nova com GRANT antes do RLS, uma coluna nova em obras.

create table if not exists public.obra_prazos (
    company_id uuid primary key references public.companies(id) on delete cascade,
    prazos     jsonb not null default '{"documentos":5,"protocolo":5,"parecer":15,"instalacao":10,"vistoria":7,"medidor":7}'::jsonb,
    updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.obra_prazos to authenticated;
grant all on public.obra_prazos to service_role;
alter table public.obra_prazos enable row level security;

drop policy if exists obra_prazos_select on public.obra_prazos;
create policy obra_prazos_select on public.obra_prazos for select to authenticated
    using (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists obra_prazos_insert on public.obra_prazos;
create policy obra_prazos_insert on public.obra_prazos for insert to authenticated
    with check (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists obra_prazos_update on public.obra_prazos;
create policy obra_prazos_update on public.obra_prazos for update to authenticated
    using (company_id = public.get_my_company_id() or public.is_super_admin())
    with check (company_id = public.get_my_company_id() or public.is_super_admin());
drop policy if exists obra_prazos_delete on public.obra_prazos;
create policy obra_prazos_delete on public.obra_prazos for delete to authenticated
    using (company_id = public.get_my_company_id() or public.is_super_admin());

drop trigger if exists obra_prazos_updated_at on public.obra_prazos;
create trigger obra_prazos_updated_at before update on public.obra_prazos
    for each row execute function public.update_updated_at();

alter table public.obras add column if not exists avisado_em timestamptz;

-- Mudou de etapa: o aviso pode voltar a sair, e o relógio recomeça mesmo se o
-- escritor esquecer de mandar etapa_desde.
create or replace function public.obras_mudou_etapa()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    if new.etapa is distinct from old.etapa then
        new.avisado_em := null;
        if new.etapa_desde is not distinct from old.etapa_desde then
            new.etapa_desde := now();
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists obras_mudou_etapa on public.obras;
create trigger obras_mudou_etapa before update of etapa on public.obras
    for each row execute function public.obras_mudou_etapa();

create or replace function public.trigger_pos_venda_aviso()
returns bigint
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
    v_url text := 'https://omsdkjzkphflpwnbaeye.supabase.co/functions/v1/pos-venda-aviso';
    v_cron_secret text;
    v_anon_key text;
    v_request_id bigint;
begin
    if not exists (select 1 from public.obras where etapa <> 'ligada') then
        return null;
    end if;
    select decrypted_secret into v_cron_secret from vault.decrypted_secrets where name = 'eva_cron_secret' limit 1;
    select decrypted_secret into v_anon_key from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;
    if v_cron_secret is null or v_anon_key is null then
        raise warning 'trigger_pos_venda_aviso: secrets ausentes no vault, pulando';
        return null;
    end if;
    select net.http_post(
        url := v_url,
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || v_anon_key,
            'x-cron-secret', v_cron_secret
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
    ) into v_request_id;
    return v_request_id;
end;
$function$;

revoke all on function public.trigger_pos_venda_aviso() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'pos-venda-aviso';
select cron.schedule('pos-venda-aviso', '0 12 * * 1-5', 'select public.trigger_pos_venda_aviso();');
