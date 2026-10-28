-- Modo atendente (28/10/2026): um módulo ligado por empresa que responde
-- sozinho, no WhatsApp da própria empresa, quem escreveu primeiro, e só sobre
-- dúvidas e agendamento. É a ÚNICA exceção à regra "nada sai pro lead sem
-- aprovação" e fica restrita por estas tabelas:
--   - atendente_config.enabled: só service_role e super admin ligam
--     (guard_atendente_enabled). Sem a linha ou com false, nada muda.
--   - atendente_conversas: pausa por conversa (passou pro dono, ou o dono
--     respondeu à mão). Pausado, o atendente não fala nada ali.
--   - atendente_agendamentos: a agenda simples (horário de funcionamento menos
--     o marcado). Reserva só pela RPC atendente_reservar, que trava por empresa.
--   - atendente_runs: uma linha por mensagem recebida que o atendente tratou.
--     Separado de agent_runs de propósito: aquela auditoria prova que a EVA
--     não envia nada sozinha.
-- Aditiva: nenhuma tabela existente muda.

-- ── Configuração ─────────────────────────────────────────────────────────────
create table if not exists public.atendente_config (
  company_id        uuid primary key references public.companies(id) on delete cascade,
  enabled           boolean not null default false,
  business_name     text,
  segment           text,
  address           text,
  -- [[id, rótulo, minutos], ...], o mesmo formato de agent.services das prévias
  services          jsonb not null default '[]'::jsonb,
  -- 7 posições, segunda a domingo, cada uma com [[início, fim], ...]
  hours             jsonb not null default '[[],[],[],[],[],[],[]]'::jsonb,
  notes             text,
  rules             text[] not null default '{}',
  tone              text,
  -- WhatsApp pessoal do dono para o aviso de "passei pra você". O número da
  -- empresa não serve: em coexistência ele é o próprio WhatsApp do dono.
  owner_alert_phone text,
  timezone          text not null default 'America/Sao_Paulo',
  slot_step_min     integer not null default 30 check (slot_step_min between 5 and 120),
  days_ahead        integer not null default 30 check (days_ahead between 1 and 90),
  capacity          integer not null default 1 check (capacity between 1 and 20),
  -- Volta a responder sozinho depois de N horas sem mensagem do dono na conversa.
  resume_after_hours integer not null default 24 check (resume_after_hours between 1 and 720),
  -- 'interno' = só esta agenda; 'google' fica para quando ligar o Google Agenda.
  calendar_provider text not null default 'interno' check (calendar_provider in ('interno', 'google')),
  google_calendar_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Agenda ───────────────────────────────────────────────────────────────────
create table if not exists public.atendente_agendamentos (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references public.companies(id) on delete cascade,
  conversation_id   uuid references public.channel_conversations(id) on delete set null,
  contact_id        uuid references public.channel_contacts(id) on delete set null,
  service_id        text,
  service_label     text,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  customer_name     text,
  customer_phone    text,
  notes             text,
  status            text not null default 'confirmado' check (status in ('confirmado', 'cancelado')),
  -- atendente = marcado no WhatsApp; manual = o dono bloqueou; teste = simulação no app
  source            text not null default 'atendente' check (source in ('atendente', 'manual', 'teste')),
  external_event_id text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists atendente_agendamentos_company_starts
  on public.atendente_agendamentos (company_id, starts_at) where status = 'confirmado';
create index if not exists atendente_agendamentos_conversation
  on public.atendente_agendamentos (conversation_id);

-- ── Estado por conversa ──────────────────────────────────────────────────────
create table if not exists public.atendente_conversas (
  conversation_id   uuid primary key references public.channel_conversations(id) on delete cascade,
  company_id        uuid not null references public.companies(id) on delete cascade,
  estado            text not null default 'ativo' check (estado in ('ativo', 'com_dono')),
  motivo            text,
  resumo            text,
  pausado_em        timestamptz,
  -- Última mensagem do dono à mão; a retomada automática conta daqui.
  dono_respondeu_em timestamptz,
  -- Ids que o próprio atendente enviou: o eco do envio não pode pausar a conversa.
  bot_message_ids   text[] not null default '{}',
  -- Janela de um envio em andamento (o eco pode chegar antes do id voltar).
  enviando_ate      timestamptz,
  pediu_texto       boolean not null default false,
  aviso_dono_erro   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists atendente_conversas_company_estado
  on public.atendente_conversas (company_id, estado);

-- ── Execuções ────────────────────────────────────────────────────────────────
create table if not exists public.atendente_runs (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.companies(id) on delete cascade,
  conversation_id     uuid references public.channel_conversations(id) on delete cascade,
  inbound_message_id  uuid unique references public.channel_messages(id) on delete cascade,
  status              text not null default 'running'
                      check (status in ('running', 'replied', 'handoff', 'skipped', 'error')),
  skip_reason         text,
  tools_used          text[] not null default '{}',
  model               text,
  input_tokens        integer,
  output_tokens       integer,
  error               text,
  started_at          timestamptz not null default now(),
  finished_at         timestamptz
);
create index if not exists atendente_runs_company_started on public.atendente_runs (company_id, started_at desc);
create index if not exists atendente_runs_conversation_started on public.atendente_runs (conversation_id, started_at desc);

-- ── GRANT antes de RLS ───────────────────────────────────────────────────────
grant select, insert, update, delete on public.atendente_config to authenticated, service_role;
grant select, insert, update, delete on public.atendente_agendamentos to authenticated, service_role;
grant select, insert, update, delete on public.atendente_conversas to authenticated, service_role;
grant select on public.atendente_runs to authenticated;
grant select, insert, update, delete on public.atendente_runs to service_role;

alter table public.atendente_config enable row level security;
alter table public.atendente_agendamentos enable row level security;
alter table public.atendente_conversas enable row level security;
alter table public.atendente_runs enable row level security;

-- config: membros leem; admin da empresa edita; super admin tudo.
drop policy if exists atendente_config_select on public.atendente_config;
create policy atendente_config_select on public.atendente_config for select to authenticated
  using (public.is_super_admin() or company_id = public.get_my_company_id());
drop policy if exists atendente_config_insert on public.atendente_config;
create policy atendente_config_insert on public.atendente_config for insert to authenticated
  with check (public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)));
drop policy if exists atendente_config_update on public.atendente_config;
create policy atendente_config_update on public.atendente_config for update to authenticated
  using (public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)))
  with check (public.is_super_admin() or (company_id = public.get_my_company_id() and public.has_role(auth.uid(), 'admin'::public.app_role)));
drop policy if exists atendente_config_delete on public.atendente_config;
create policy atendente_config_delete on public.atendente_config for delete to authenticated
  using (public.is_super_admin());

-- agenda: membros leem e mexem na agenda da própria empresa (o dono marca à mão).
drop policy if exists atendente_agendamentos_select on public.atendente_agendamentos;
create policy atendente_agendamentos_select on public.atendente_agendamentos for select to authenticated
  using (public.is_super_admin() or company_id = public.get_my_company_id());
drop policy if exists atendente_agendamentos_insert on public.atendente_agendamentos;
create policy atendente_agendamentos_insert on public.atendente_agendamentos for insert to authenticated
  with check (public.is_super_admin() or company_id = public.get_my_company_id());
drop policy if exists atendente_agendamentos_update on public.atendente_agendamentos;
create policy atendente_agendamentos_update on public.atendente_agendamentos for update to authenticated
  using (public.is_super_admin() or company_id = public.get_my_company_id())
  with check (public.is_super_admin() or company_id = public.get_my_company_id());
drop policy if exists atendente_agendamentos_delete on public.atendente_agendamentos;
create policy atendente_agendamentos_delete on public.atendente_agendamentos for delete to authenticated
  using (public.is_super_admin() or company_id = public.get_my_company_id());

-- conversas: membros leem e devolvem ao atendente; quem cria é a edge.
drop policy if exists atendente_conversas_select on public.atendente_conversas;
create policy atendente_conversas_select on public.atendente_conversas for select to authenticated
  using (public.is_super_admin() or company_id = public.get_my_company_id());
drop policy if exists atendente_conversas_insert on public.atendente_conversas;
create policy atendente_conversas_insert on public.atendente_conversas for insert to authenticated
  with check (public.is_super_admin() or company_id = public.get_my_company_id());
drop policy if exists atendente_conversas_update on public.atendente_conversas;
create policy atendente_conversas_update on public.atendente_conversas for update to authenticated
  using (public.is_super_admin() or company_id = public.get_my_company_id())
  with check (public.is_super_admin() or company_id = public.get_my_company_id());
drop policy if exists atendente_conversas_delete on public.atendente_conversas;
create policy atendente_conversas_delete on public.atendente_conversas for delete to authenticated
  using (public.is_super_admin());

-- runs: só leitura no app.
drop policy if exists atendente_runs_select on public.atendente_runs;
create policy atendente_runs_select on public.atendente_runs for select to authenticated
  using (public.is_super_admin() or company_id = public.get_my_company_id());

-- ── updated_at ───────────────────────────────────────────────────────────────
drop trigger if exists atendente_config_updated_at on public.atendente_config;
create trigger atendente_config_updated_at before update on public.atendente_config
  for each row execute function public.update_updated_at();
drop trigger if exists atendente_agendamentos_updated_at on public.atendente_agendamentos;
create trigger atendente_agendamentos_updated_at before update on public.atendente_agendamentos
  for each row execute function public.update_updated_at();
drop trigger if exists atendente_conversas_updated_at on public.atendente_conversas;
create trigger atendente_conversas_updated_at before update on public.atendente_conversas
  for each row execute function public.update_updated_at();

-- ── A flag só muda por service_role ou super admin ───────────────────────────
create or replace function public.guard_atendente_enabled()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if coalesce(auth.role(), '') not in ('anon', 'authenticated')
     or coalesce(public.is_super_admin(), false) then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.enabled := false;
  else
    new.enabled := old.enabled;
  end if;
  return new;
end;
$function$;

drop trigger if exists guard_atendente_enabled on public.atendente_config;
create trigger guard_atendente_enabled before insert or update on public.atendente_config
  for each row execute function public.guard_atendente_enabled();

-- ── Reserva com trava por empresa ────────────────────────────────────────────
-- Duas conversas pedindo o mesmo horário ao mesmo tempo: a trava faz a segunda
-- ver a primeira e receber 'ocupado'. Capacidade vem da config (padrão 1).
create or replace function public.atendente_reservar(
  p_company_id      uuid,
  p_starts_at       timestamptz,
  p_ends_at         timestamptz,
  p_service_id      text,
  p_service_label   text,
  p_customer_name   text,
  p_customer_phone  text,
  p_conversation_id uuid default null,
  p_contact_id      uuid default null,
  p_source          text default 'atendente',
  p_notes           text default null
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_capacity integer;
  v_busy     integer;
  v_id       uuid;
begin
  if coalesce(auth.role(), '') in ('anon', 'authenticated')
     and not coalesce(public.is_super_admin(), false)
     and p_company_id is distinct from public.get_my_company_id() then
    raise exception 'empresa fora do seu acesso';
  end if;
  if p_ends_at <= p_starts_at then
    return jsonb_build_object('ok', false, 'erro', 'intervalo inválido');
  end if;

  perform pg_advisory_xact_lock(hashtext('atendente:' || p_company_id::text));

  select coalesce(capacity, 1) into v_capacity from public.atendente_config where company_id = p_company_id;
  v_capacity := coalesce(v_capacity, 1);

  select count(*) into v_busy
    from public.atendente_agendamentos
   where company_id = p_company_id
     and status = 'confirmado'
     and tstzrange(starts_at, ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)');

  if v_busy >= v_capacity then
    return jsonb_build_object('ok', false, 'erro', 'ocupado');
  end if;

  insert into public.atendente_agendamentos (
    company_id, conversation_id, contact_id, service_id, service_label,
    starts_at, ends_at, customer_name, customer_phone, notes, source
  ) values (
    p_company_id, p_conversation_id, p_contact_id, p_service_id, p_service_label,
    p_starts_at, p_ends_at, p_customer_name, p_customer_phone, p_notes,
    coalesce(p_source, 'atendente')
  ) returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end;
$function$;

revoke all on function public.atendente_reservar(uuid, timestamptz, timestamptz, text, text, text, text, uuid, uuid, text, text) from public, anon;
grant execute on function public.atendente_reservar(uuid, timestamptz, timestamptz, text, text, text, text, uuid, uuid, text, text) to authenticated, service_role;
