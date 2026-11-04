-- Agenda: "Não foi" (04/11/2026)
-- O app marca compromisso que não aconteceu como 'nao_compareceu' (botão "Não foi"
-- da Agenda e CallForm), mas o enum só tinha agendado, realizado e cancelado: o
-- update falhava. Aditiva: só acrescenta o valor.
alter type public.appointment_status add value if not exists 'nao_compareceu';
