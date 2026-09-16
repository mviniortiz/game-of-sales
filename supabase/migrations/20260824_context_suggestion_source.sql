-- LEARN.1 (2026-08-24) — De onde veio cada sugestão de contexto.
--
-- Até agora só existia uma origem (documento colado), então a UI deduzia a
-- fonte pelo document_id: null significava "o texto que você colou". Com a EVA
-- aprendendo também das conversas, essa dedução passa a mentir: sugestão tirada
-- do WhatsApp apareceria como texto colado, e a pessoa aprovaria sem saber de
-- onde aquilo saiu.
--
-- Aditiva, com default que preserva o significado do que já existe.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260824_context_suggestion_source.sql

alter table public.eva_context_suggestions
  add column if not exists source text not null default 'document'
    check (source in ('document', 'conversations'));

comment on column public.eva_context_suggestions.source is
  'LEARN.1: origem da sugestão. document = texto colado ou arquivo enviado (eva_training_documents); conversations = deduzida pela EVA a partir dos atendimentos no WhatsApp.';

-- Backfill: o que a edge de conversas já gravou no teste desta migration não
-- tem document_id. Tudo que tem documento é, por definição, 'document'.
update public.eva_context_suggestions
   set source = 'conversations'
 where document_id is null
   and content->>'source' = 'conversas';

create index if not exists idx_eva_context_suggestions_pending_source
  on public.eva_context_suggestions(company_id, source)
  where status = 'pending';

do $$
declare
    v_conversas integer;
begin
    select count(*) into v_conversas from public.eva_context_suggestions where source = 'conversations';
    raise notice 'LEARN.1 aplicado: coluna source criada, % sugestoes marcadas como vindas de conversa.', v_conversas;
end $$;
