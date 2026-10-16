-- Início da rampa de aquecimento separado da troca do chip (chip_desde), que
-- também separa as conversas do número antigo. Usado quando o dono adianta o
-- aquecimento: em 16/10/2026 o Markus pediu para começar no mesmo dia da troca,
-- então a rampa conta a partir de 15/10 (hoje = 1º dia útil = 3 frias).
alter table public.prospecting_instances add column if not exists rampa_desde timestamptz;

update public.prospecting_instances
set rampa_desde = '2026-10-15T13:00:00Z'
where numero_chip = '5511936247836' and rampa_desde is null;
