-- ============================================================================
-- Eva Unified — PATCH: grants faltando nas tabelas
-- ============================================================================
-- service_role bypassa RLS mas precisa de permissão SQL no nível da tabela.
-- authenticated é quem acessa via PostgREST.
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_summaries TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eva_memory TO authenticated, service_role;

-- Também garantir grant nas sequences (caso haja)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Força reload do schema cache
NOTIFY pgrst, 'reload schema';
