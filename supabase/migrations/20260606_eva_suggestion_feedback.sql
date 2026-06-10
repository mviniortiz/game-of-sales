-- EVA.INBOX.2 (2026-06-06) — Loop de aprendizado da resposta sugerida.
--
-- Cada envio a partir da sugestão da EVA vira um sinal:
--   accepted = enviou direto | edited = editou antes (com similarity 0..1).
-- Taxa de aceitação por company = query simples aqui. É o dado que no futuro
-- destrava a escada de autonomia. NENHUMA UI expõe isso ainda.
--
-- APLICAR via `supabase db query --linked -f` (nunca db push — drift local).

create table if not exists public.eva_suggestion_feedback (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  chat_phone      text,
  conversation_id uuid references public.channel_conversations(id) on delete set null,
  suggestion_text text not null,
  sent_text       text not null,
  outcome         text not null check (outcome in ('accepted','edited')),
  similarity      numeric(5,4) check (similarity >= 0 and similarity <= 1),
  confidence      numeric(5,4) check (confidence >= 0 and confidence <= 1),
  created_at      timestamptz not null default now()
);

create index if not exists idx_eva_sugg_feedback_company_created
  on public.eva_suggestion_feedback(company_id, created_at desc);

-- GRANT antes de RLS (RLS só roda DEPOIS do grant).
-- Sem UPDATE pra authenticated: log de aprendizado é imutável no client.
-- DELETE tem grant mas a policy restringe a super_admin.
grant select, insert, delete on public.eva_suggestion_feedback to authenticated;
grant all on public.eva_suggestion_feedback to service_role;

alter table public.eva_suggestion_feedback enable row level security;

-- As 4 ops, explícitas:
-- SELECT — membro da company (qualquer vendedor; a taxa é do time).
create policy "eva_sugg_feedback_select" on public.eva_suggestion_feedback for select
  using ( public.is_super_admin() or company_id = public.get_my_company_id() );
-- INSERT — membro da company gravando o PRÓPRIO envio (vendedor, não só admin).
create policy "eva_sugg_feedback_insert" on public.eva_suggestion_feedback for insert
  with check (
    public.is_super_admin()
    or (company_id = public.get_my_company_id() and user_id = auth.uid())
  );
-- UPDATE — ninguém via client (sem policy + sem grant): sinal não se reescreve.
-- DELETE — só super_admin (limpeza administrativa).
create policy "eva_sugg_feedback_delete" on public.eva_suggestion_feedback for delete
  using ( public.is_super_admin() );
