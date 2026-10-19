-- Modo automático da prospecção: até auto_ate, o lote do dia e as respostas às
-- integradoras saem sem o 👍 do dono (decisão do Markus em 19/10/2026, na hora do
-- almoço). Áudio transcrito continua esperando o dono. null = sempre com 👍.
alter table public.prospecting_instances add column if not exists auto_ate timestamptz;
