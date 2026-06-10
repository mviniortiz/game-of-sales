-- EVA.STUDIO.5 — Aplicação granular do blueprint.
-- Amplia eva_blueprints: novo status 'partially_applied' + registro do que foi
-- aplicado (applied_sections jsonb, applied_at, applied_by). Sem service_role,
-- sem aplicar nada na operação automaticamente — RLS já existente cobre escrita.

-- 1) status agora aceita 'partially_applied'
alter table public.eva_blueprints drop constraint if exists eva_blueprints_status_check;
alter table public.eva_blueprints
  add constraint eva_blueprints_status_check
  check (status in ('draft','in_review','ready_to_test','prepared','published_preview','partially_applied'));

-- 2) registro de aplicação parcial
alter table public.eva_blueprints add column if not exists applied_sections jsonb not null default '{}'::jsonb;
alter table public.eva_blueprints add column if not exists applied_at timestamptz;
alter table public.eva_blueprints add column if not exists applied_by uuid references auth.users(id) on delete set null;

comment on column public.eva_blueprints.applied_sections is
  'EVA.STUDIO.5: blocos aplicados {tags_applied,gaps_applied,rules_applied} (contagens). Aplicação granular, low-risk, com confirmação.';
