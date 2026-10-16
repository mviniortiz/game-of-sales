-- Números que já passaram pela prospecção, para a volta de um deles não reiniciar o
-- aquecimento nem esconder as conversas dele no Inbox. Chave = número; valor =
-- {chip_desde, rampa_desde?, aquecido?}. O pessoal do Markus (554891696887) fez 113
-- envios sem queda até 16/10/2026: volta aquecido, com o teto em 12 na segunda 19/10.
alter table public.prospecting_instances add column if not exists numeros_conhecidos jsonb not null default '{}'::jsonb;
update public.prospecting_instances
set numeros_conhecidos = numeros_conhecidos || jsonb_build_object(
  '554891696887', jsonb_build_object('chip_desde', '2026-09-01T00:00:00Z', 'rampa_desde', '2026-10-12T12:00:00Z', 'aquecido', true))
where is_active;
