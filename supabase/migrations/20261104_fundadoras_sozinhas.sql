-- FUNDADORAS (04/11/2026): as 10 primeiras integradoras ganham a Lume sem
-- cobrança no momento em que conectam o WhatsApp. Antes o Markus marcava "Pago"
-- à mão em AdminCompanyDetail.
--
-- Como funciona:
--   * A vaga fica em public.fundadoras (uma linha por empresa, número de 1 a 10).
--     Conta só quem está nessa tabela e não foi revogada; empresa marcada "Pago"
--     à mão (ou que assina pelo Stripe) não ocupa vaga.
--   * Liberar é o mesmo caminho do "Pago" manual: companies.subscription_status
--     = 'active' e plan = 'pro'. Assim company_is_paid(), usePlano() e as edges
--     que leem subscription_status (whatsapp-copilot, admin-create-seller,
--     eva-stale-deal-followup) abrem sem mudar nada.
--   * Quem dispara: trigger em channel_connections quando a conexão de WhatsApp
--     vira 'active' (insert já ativo ou troca de status). Os escritores hoje são
--     todos service_role (webhook, histórico, status do evolution-whatsapp), então
--     o guard_company_billing deixa passar.
--   * Idempotente: empresa que já tem linha em fundadoras não ganha outra.
--
-- Revogar uma vaga (super admin, no SQL editor):
--   update public.fundadoras set revogada_em = now() where company_id = '<id>';
--   update public.companies set subscription_status = 'inactive', plan = 'free' where id = '<id>';
-- A vaga revogada volta a ficar livre; a empresa revogada não recebe outra sozinha.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261104_fundadoras_sozinhas.sql
-- Teste (não aplica nada): supabase/tests/fundadoras_sozinhas_test.sql

-- ── 1) Tabela das vagas ─────────────────────────────────────────────────────
create table if not exists public.fundadoras (
    company_id   uuid primary key references public.companies(id) on delete cascade,
    numero       smallint not null check (numero between 1 and 100),
    concedida_em timestamptz not null default now(),
    revogada_em  timestamptz
);
create unique index if not exists fundadoras_numero_ativo_key
    on public.fundadoras (numero) where revogada_em is null;

comment on table public.fundadoras is
    'As primeiras integradoras, liberadas sem cobrança ao conectar o WhatsApp (conceder_fundadora). Vaga ativa = revogada_em is null.';

grant select on public.fundadoras to authenticated;
grant all on public.fundadoras to service_role;
alter table public.fundadoras enable row level security;

-- Só leitura pelo app: a própria empresa ou o super admin. Insert, update e
-- delete ficam sem policy (negados); quem grava é a conceder_fundadora.
drop policy if exists fundadoras_select on public.fundadoras;
create policy fundadoras_select on public.fundadoras
    for select to authenticated
    using (company_id = public.get_my_company_id() or public.is_super_admin());

-- ── 2) Quantas vagas ────────────────────────────────────────────────────────
create or replace function public.fundadoras_limite()
returns int
language sql
immutable
as $$ select 10 $$;

-- ── 3) Regra de empresa de teste ────────────────────────────────────────────
-- Conservadora de propósito: na dúvida, a empresa ganha a vaga. Pega nome com
-- "teste", a palavra test/demo/e2e, nome de uma letra repetida ("Ggg") ou
-- alguém da empresa com email de domínio de teste/da casa ou do tipo
-- teste@... Para mudar, recrie só esta função.
create or replace function public.empresa_de_teste(p_company uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.companies c
         where c.id = p_company
           and (
                lower(coalesce(c.name, '')) like '%teste%'
             or lower(coalesce(c.name, '')) ~ '\m(test|demo|e2e)\M'
             or lower(btrim(coalesce(c.name, ''))) ~ '^(.)\1+$'
           )
    )
    or exists (
        select 1 from public.profiles p
         where p.company_id = p_company
           and p.email is not null
           and (
                lower(split_part(p.email, '@', 2)) = any (array[
                    'example.com', 'test.com', 'teste.com', 'teste.com.br',
                    'solarteste.com.br', 'vyzon.com.br', 'vyzon-test.internal',
                    'markus.com', 'gg.com', 'ggg.com', 'gm.com'
                ])
             or lower(split_part(p.email, '@', 1)) ~ '^test(e)?[0-9]*$'
           )
    );
$$;

-- ── 4) Conceder a próxima vaga ──────────────────────────────────────────────
create or replace function public.conceder_fundadora(p_company uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_status text;
    v_ja     record;
    v_numero int;
begin
    if p_company is null then
        return jsonb_build_object('concedida', false, 'motivo', 'sem empresa');
    end if;

    -- Uma concessão por vez no banco inteiro: duas conexões no mesmo segundo
    -- não pegam o mesmo número nem passam do limite.
    perform pg_advisory_xact_lock(hashtext('vyzon:fundadoras'));

    select subscription_status into v_status from public.companies where id = p_company for update;
    if not found then
        return jsonb_build_object('concedida', false, 'motivo', 'empresa nao encontrada');
    end if;

    select numero, revogada_em into v_ja from public.fundadoras where company_id = p_company;
    if found then
        return jsonb_build_object(
            'concedida', v_ja.revogada_em is null,
            'numero', case when v_ja.revogada_em is null then v_ja.numero end,
            'motivo', case when v_ja.revogada_em is null then 'ja fundadora' else 'revogada' end);
    end if;

    if p_company = '00000000-0000-0000-0000-000000000001'::uuid then
        return jsonb_build_object('concedida', false, 'motivo', 'empresa do vyzon');
    end if;
    if v_status = 'active' then
        return jsonb_build_object('concedida', false, 'motivo', 'ja paga');
    end if;
    if exists (select 1 from public.profiles where company_id = p_company and coalesce(is_super_admin, false)) then
        return jsonb_build_object('concedida', false, 'motivo', 'super admin');
    end if;
    if not exists (
        select 1 from public.profiles p
          join public.user_roles r on r.user_id = p.id and r.role = 'admin'
         where p.company_id = p_company and not coalesce(p.is_super_admin, false)
    ) then
        return jsonb_build_object('concedida', false, 'motivo', 'sem dono');
    end if;
    if public.empresa_de_teste(p_company) then
        return jsonb_build_object('concedida', false, 'motivo', 'teste');
    end if;

    select min(n) into v_numero
      from generate_series(1, public.fundadoras_limite()) n
     where not exists (select 1 from public.fundadoras f where f.numero = n and f.revogada_em is null);
    if v_numero is null then
        return jsonb_build_object('concedida', false, 'motivo', 'sem vaga');
    end if;

    insert into public.fundadoras (company_id, numero) values (p_company, v_numero);
    update public.companies set subscription_status = 'active', plan = 'pro' where id = p_company;

    return jsonb_build_object('concedida', true, 'numero', v_numero, 'motivo', 'nova');
end;
$$;

revoke all on function public.conceder_fundadora(uuid) from public, anon, authenticated;
grant execute on function public.conceder_fundadora(uuid) to service_role;
revoke all on function public.empresa_de_teste(uuid) from public, anon, authenticated;
grant execute on function public.empresa_de_teste(uuid) to service_role;

-- ── 5) Gatilho: WhatsApp conectado ──────────────────────────────────────────
-- O status do evolution-whatsapp regrava 'active' a cada checagem; só a
-- passagem para 'active' (ou o insert já ativo) tenta a vaga. Falha aqui nunca
-- derruba a gravação da conexão.
create or replace function public.fundadora_ao_conectar()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.status is distinct from 'active' or new.channel_type is distinct from 'whatsapp' then
        return new;
    end if;
    if tg_op = 'UPDATE' and old.status = 'active' then
        return new;
    end if;
    begin
        perform public.conceder_fundadora(new.company_id);
    exception when others then
        raise warning '[fundadora_ao_conectar] empresa %: %', new.company_id, sqlerrm;
    end;
    return new;
end;
$$;

revoke all on function public.fundadora_ao_conectar() from public, anon, authenticated;

drop trigger if exists trg_fundadora_ao_conectar on public.channel_connections;
create trigger trg_fundadora_ao_conectar
    after insert or update of status on public.channel_connections
    for each row execute function public.fundadora_ao_conectar();

-- ── 6) Leitura pelo app ─────────────────────────────────────────────────────
-- Empresa efetiva: a do usuário; o super admin pode pedir a de outra.
create or replace function public.minha_vaga_fundadora(p_company uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_company uuid;
    v_numero  int;
    v_usadas  int;
begin
    v_company := case when p_company is not null and coalesce(public.is_super_admin(), false)
                      then p_company else public.get_my_company_id() end;
    select count(*) into v_usadas from public.fundadoras where revogada_em is null;
    if v_company is not null then
        select numero into v_numero from public.fundadoras where company_id = v_company and revogada_em is null;
    end if;
    return jsonb_build_object(
        'fundadora', v_numero is not null,
        'numero', v_numero,
        'vagas_restantes', greatest(public.fundadoras_limite() - v_usadas, 0),
        'limite', public.fundadoras_limite());
end;
$$;

revoke all on function public.minha_vaga_fundadora(uuid) from public, anon;
grant execute on function public.minha_vaga_fundadora(uuid) to authenticated, service_role;
