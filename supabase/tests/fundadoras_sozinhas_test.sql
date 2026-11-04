-- Teste da migration 20261104_fundadoras_sozinhas.sql. NÃO aplica nada: tudo
-- roda dentro de begin ... rollback. Rodar só depois da migration aplicada:
--   npx supabase db query --linked -f supabase/tests/fundadoras_sozinhas_test.sql
-- Cada checagem que falha levanta exceção (e o rollback desfaz o resto).
--
-- Cobre: 11 conexões de empresas reais (10 ganham, a 11ª fica sem vaga),
-- idempotência (reconectar não muda o número nem gasta vaga) e as empresas que
-- nunca ganham (teste, Vyzon, já paga, sem dono).

begin;

-- Zera as vagas só dentro desta transação, para o teste não depender de
-- quantas fundadoras já existem.
update public.fundadoras set revogada_em = now() where revogada_em is null;

create temp table _t (k int primary key, company_id uuid, user_id uuid) on commit drop;
insert into _t select k, gen_random_uuid(), gen_random_uuid() from generate_series(1, 11) k;

-- 11 integradoras com dono de verdade (o handle_new_user cria o profile e o
-- papel admin a partir do metadata, como no cadastro).
insert into public.companies (id, name, plan, subscription_status)
select company_id, 'Integradora Sol Nascente ' || k, 'free', 'inactive' from _t;

insert into auth.users (id, email, raw_user_meta_data, aud, role)
select user_id, 'dono' || k || '@solnascente' || k || '.com.br',
       jsonb_build_object('company_id', company_id, 'role', 'admin', 'nome', 'Dono ' || k),
       'authenticated', 'authenticated'
  from _t;

do $$
begin
    if (select count(*) from public.profiles p join _t on _t.user_id = p.id and p.company_id = _t.company_id) <> 11 then
        raise exception 'setup: profiles não foram criados com a empresa';
    end if;
    if (select count(*) from public.user_roles r join _t on _t.user_id = r.user_id and r.role = 'admin') <> 11 then
        raise exception 'setup: papel admin não foi criado';
    end if;
end $$;

-- Conecta as 11, uma por vez, pelo caminho real: a conexão nasce pendente e
-- vira 'active' (como o webhook faz).
insert into public.channel_connections (company_id, provider, channel_type, external_id, status)
select company_id, 'evolution', 'whatsapp', 'wa_teste_fundadora_' || k, 'pending' from _t order by k;

do $$
declare r record;
begin
    for r in select * from _t order by k loop
        update public.channel_connections set status = 'active'
         where external_id = 'wa_teste_fundadora_' || r.k;
    end loop;
end $$;

do $$
declare
    v_ganharam int;
    v_onze     record;
begin
    select count(*) into v_ganharam
      from public.fundadoras f join _t on _t.company_id = f.company_id
     where f.revogada_em is null;
    if v_ganharam <> 10 then
        raise exception '11 conexões: esperava 10 fundadoras, veio %', v_ganharam;
    end if;

    -- Ordem de chegada = número da vaga.
    if exists (select 1 from public.fundadoras f join _t on _t.company_id = f.company_id where f.numero <> _t.k) then
        raise exception 'números fora da ordem de conexão';
    end if;

    -- As 10 viraram pagas pelo mesmo caminho do "Pago" manual.
    if (select count(*) from public.companies c join _t on _t.company_id = c.id
         where _t.k <= 10 and c.subscription_status = 'active' and c.plan = 'pro'
           and public.company_is_paid(c.id)) <> 10 then
        raise exception 'fundadora não ficou paga';
    end if;

    -- A 11ª ficou de fora, sem plano.
    select c.subscription_status, c.plan into v_onze from public.companies c join _t on _t.company_id = c.id where _t.k = 11;
    if v_onze.subscription_status <> 'inactive' or exists (select 1 from public.fundadoras f join _t on _t.company_id = f.company_id where _t.k = 11) then
        raise exception 'a 11ª ganhou vaga ou plano';
    end if;
    if (public.conceder_fundadora((select company_id from _t where k = 11)))->>'motivo' <> 'sem vaga' then
        raise exception 'a 11ª deveria dar "sem vaga"';
    end if;
    raise notice 'ok: 11 conexões, 10 fundadoras, a 11ª sem vaga';
end $$;

-- Idempotência: cair e voltar não troca o número nem gasta vaga; chamar a
-- função de novo devolve a mesma vaga.
update public.channel_connections set status = 'disconnected' where external_id = 'wa_teste_fundadora_3';
update public.channel_connections set status = 'active' where external_id = 'wa_teste_fundadora_3';
update public.channel_connections set status = 'active' where external_id = 'wa_teste_fundadora_3';

do $$
declare v jsonb;
begin
    v := public.conceder_fundadora((select company_id from _t where k = 3));
    if (v->>'numero')::int <> 3 or v->>'motivo' <> 'ja fundadora' then
        raise exception 'idempotência: esperava a vaga 3, veio %', v;
    end if;
    if (select count(*) from public.fundadoras where revogada_em is null) <> 10 then
        raise exception 'idempotência: reconectar gastou vaga';
    end if;
    raise notice 'ok: reconectar e repetir não mudam nada';
end $$;

-- Revogar a 2 libera a vaga 2. Empresa de teste, a do Vyzon, uma já paga e uma
-- sem dono nunca a pegam; a 11ª pega.
update public.fundadoras set revogada_em = now()
 where company_id = (select company_id from _t where k = 2);

do $$
declare
    v_teste  uuid := gen_random_uuid();
    v_teste2 uuid := gen_random_uuid();
    v_paga   uuid := gen_random_uuid();
    v_orfa   uuid := gen_random_uuid();
    v_u1     uuid := gen_random_uuid();
    v_u2     uuid := gen_random_uuid();
    v_u3     uuid := gen_random_uuid();
    v        jsonb;
begin
    -- Nome de teste, com dono real.
    insert into public.companies (id, name, plan, subscription_status) values (v_teste, 'Solarteste', 'free', 'inactive');
    insert into auth.users (id, email, raw_user_meta_data, aud, role)
    values (v_u1, 'joao@integradorasul.com.br', jsonb_build_object('company_id', v_teste, 'role', 'admin'), 'authenticated', 'authenticated');
    -- Nome normal, email de domínio de teste.
    insert into public.companies (id, name, plan, subscription_status) values (v_teste2, 'Ggg Energia', 'free', 'inactive');
    insert into auth.users (id, email, raw_user_meta_data, aud, role)
    values (v_u2, 'ana@solarteste.com.br', jsonb_build_object('company_id', v_teste2, 'role', 'admin'), 'authenticated', 'authenticated');
    -- Já paga por fora.
    insert into public.companies (id, name, plan, subscription_status) values (v_paga, 'Energia Paga', 'pro', 'active');
    insert into auth.users (id, email, raw_user_meta_data, aud, role)
    values (v_u3, 'dono@energiapaga.com.br', jsonb_build_object('company_id', v_paga, 'role', 'admin'), 'authenticated', 'authenticated');
    -- Sem ninguém dentro.
    insert into public.companies (id, name, plan, subscription_status) values (v_orfa, 'Empresa Sem Dono', 'free', 'inactive');

    insert into public.channel_connections (company_id, provider, channel_type, external_id, status) values
        (v_teste,  'evolution', 'whatsapp', 'wa_teste_fundadora_t1', 'active'),
        (v_teste2, 'evolution', 'whatsapp', 'wa_teste_fundadora_t2', 'active'),
        (v_paga,   'evolution', 'whatsapp', 'wa_teste_fundadora_p',  'active'),
        (v_orfa,   'evolution', 'whatsapp', 'wa_teste_fundadora_o',  'active');

    if exists (select 1 from public.fundadoras where company_id in (v_teste, v_teste2, v_paga, v_orfa)) then
        raise exception 'empresa que devia ser pulada ganhou vaga';
    end if;
    if public.conceder_fundadora(v_teste)->>'motivo' <> 'teste' then raise exception 'nome de teste não foi pulado'; end if;
    if public.conceder_fundadora(v_teste2)->>'motivo' <> 'teste' then raise exception 'email de teste não foi pulado'; end if;
    if public.conceder_fundadora(v_paga)->>'motivo' <> 'ja paga' then raise exception 'empresa paga não foi pulada'; end if;
    if public.conceder_fundadora(v_orfa)->>'motivo' <> 'sem dono' then raise exception 'empresa sem dono não foi pulada'; end if;
    if public.conceder_fundadora('00000000-0000-0000-0000-000000000001')->>'concedida' <> 'false' then
        raise exception 'a empresa do Vyzon ganhou vaga';
    end if;
    if (select subscription_status from public.companies where id = v_teste) <> 'inactive' then
        raise exception 'empresa de teste ficou paga';
    end if;

    -- A 11ª reconecta e fica com a vaga 2.
    update public.channel_connections set status = 'disconnected' where external_id = 'wa_teste_fundadora_11';
    update public.channel_connections set status = 'active' where external_id = 'wa_teste_fundadora_11';
    v := public.conceder_fundadora((select company_id from _t where k = 11));
    if (v->>'numero')::int <> 2 then
        raise exception 'a vaga revogada não foi reaproveitada: %', v;
    end if;
    -- A revogada não ganha de novo sozinha.
    if public.conceder_fundadora((select company_id from _t where k = 2))->>'motivo' <> 'revogada' then
        raise exception 'empresa revogada ganhou vaga de novo';
    end if;
    raise notice 'ok: teste, Vyzon, paga e sem dono pulam; vaga revogada volta';
end $$;

-- Leitura pelo app, como o dono da fundadora 5.
do $$
declare v jsonb;
begin
    perform set_config('request.jwt.claims',
        jsonb_build_object('sub', (select user_id from _t where k = 5), 'role', 'authenticated')::text, true);
    perform set_config('request.jwt.claim.sub', (select user_id from _t where k = 5)::text, true);
    v := public.minha_vaga_fundadora();
    if v->>'fundadora' <> 'true' or (v->>'numero')::int <> 5 or (v->>'vagas_restantes')::int <> 0 then
        raise exception 'minha_vaga_fundadora: %', v;
    end if;
    raise notice 'ok: minha_vaga_fundadora %', v;
end $$;

rollback;
