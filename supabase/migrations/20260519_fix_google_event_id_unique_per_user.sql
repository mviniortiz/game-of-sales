-- Fix: trocar UNIQUE global em google_event_id por composite (user_id, google_event_id)
--
-- Bug: o código em google-calendar-sync filtra eventos existentes por user_id +
-- google_event_id, mas a constraint criada em 20251118011227 é global em
-- google_event_id apenas. Em race condition (auto-sync de 15min + sync manual no
-- mesmo user) ou registros órfãos sob outro user, o check passa mas o INSERT
-- viola a constraint e a edge function crasha (EDGE_FUNCTION_ERROR 500).
--
-- Fix correto: constraint composite, cada usuário pode ter seu próprio registro
-- do mesmo Google event. Combinado com upsert(onConflict, ignoreDuplicates:true)
-- na edge function, resolve também a race condition entre auto-sync e manual.

ALTER TABLE public.agendamentos
  DROP CONSTRAINT IF EXISTS agendamentos_google_event_id_key;

ALTER TABLE public.agendamentos
  ADD CONSTRAINT agendamentos_user_id_google_event_id_key
  UNIQUE (user_id, google_event_id);
