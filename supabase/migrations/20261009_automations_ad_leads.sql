-- AUTO.1 — Automações editáveis pelo dono e leads que chegam pelo anúncio de
-- conversa no WhatsApp (click-to-WhatsApp). A automação lê a conversa, qualifica
-- e escreve a resposta; o que sai para o lead passa pela aprovação do dono por
-- código no WhatsApp (mesma regra da EVA: nada sai sozinho).

create table if not exists public.automations (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  key         text not null check (key in ('lead_anuncio')),
  enabled     boolean not null default true,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

create table if not exists public.ad_leads (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  instance_name   text not null,
  phone_e164      text not null,
  -- DDD + últimos 8 dígitos: casa o número com ou sem o 9 da frente.
  phone_key       text not null,
  contact_name    text,
  ad_id           text,
  ad_headline     text,
  ctwa_clid       text,
  status          text not null default 'novo'
                  check (status in ('novo','qualificando','raio_x_oferecido','conversa_marcada','raio_x_feito','sem_fit','sem_interesse')),
  is_integrador   boolean,
  propostas_mes   text,
  cidade          text,
  conversa        text not null default '',
  reply_draft     text,
  reply_code      text,
  last_inbound_at timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (user_id, phone_key)
);

create index if not exists ad_leads_user_code_idx on public.ad_leads(user_id, reply_code) where reply_code is not null;

grant select, insert, update, delete on public.automations to authenticated, service_role;
grant select, insert, update, delete on public.ad_leads to authenticated, service_role;

alter table public.automations enable row level security;
alter table public.ad_leads enable row level security;

create policy "automations_select" on public.automations for select
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "automations_insert" on public.automations for insert
  with check ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "automations_update" on public.automations for update
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) )
  with check ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "automations_delete" on public.automations for delete
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );

create policy "ad_leads_select" on public.ad_leads for select
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "ad_leads_insert" on public.ad_leads for insert
  with check ( public.is_super_admin() );
create policy "ad_leads_update" on public.ad_leads for update
  using ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) )
  with check ( public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)) );
create policy "ad_leads_delete" on public.ad_leads for delete
  using ( public.is_super_admin() );

drop trigger if exists automations_updated_at on public.automations;
create trigger automations_updated_at before update on public.automations
  for each row execute function public.update_updated_at();
drop trigger if exists ad_leads_updated_at on public.ad_leads;
create trigger ad_leads_updated_at before update on public.ad_leads
  for each row execute function public.update_updated_at();

-- Liga a automação no número que já faz a prospecção (o do Markus).
insert into public.automations (company_id, user_id, key, enabled, config)
select company_id, user_id, 'lead_anuncio', true, jsonb_build_object(
  'prefill', 'Quero ver quanto está parado nos meus orçamentos',
  'oferta', 'Raio-X grátis: a pessoa conecta o WhatsApp e em 3 minutos vê as propostas que ficaram sem resposta e quanto elas somam.',
  'link', 'https://vyzon.com.br/criar-conta?segmento=energia_solar&utm_source=meta&utm_medium=whatsapp&utm_campaign=raiox_solar_out26',
  'perguntas', jsonb_build_array(
    'Se é dono ou cuida do comercial de uma integradora',
    'Quantas propostas manda por mês, mais ou menos',
    'De qual cidade é'
  ),
  'horario_conversa', 'dias úteis a partir das 15h',
  'tom', 'Conversa de dono para dono, curta, sem emoji, sem travessão, sem prometer resultado. Assina Markus só na primeira mensagem.'
)
from public.prospecting_instances
where is_active
on conflict (user_id, key) do nothing;
