-- Limpeza dos registros internos (09/11/2026).
--
-- O que aconteceu: o pg_cron guarda TODA execução em cron.job_run_details e
-- nada apagava (206 mil linhas, 39 MB). O pg_net guarda a resposta de cada
-- chamada das crons em net._http_response; a tabela tinha 187 linhas vivas e
-- 133 MB de espaço morto, sem limpeza automática desde 05/08. A faxina do
-- próprio pg_net (DELETE em lote) passou a levar ~700 ms e roda sem parar.
-- No servidor pequeno isso esgotou a memória, o banco foi pro disco e tudo
-- ficou lento: cadastro, login, Conversas.
--
-- Daqui pra frente: histórico das crons guarda só 3 dias e as duas tabelas
-- passam por VACUUM toda madrugada. Nada do produto lê nenhuma das duas.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20261109_limpeza_registros_internos.sql

do $$
begin
    perform cron.unschedule('limpa-historico-cron');
exception when others then null;
end $$;

select cron.schedule(
    'limpa-historico-cron',
    '15 6 * * *',
    $$delete from cron.job_run_details where end_time < now() - interval '3 days'$$
);

-- VACUUM não roda dentro de transação; o pg_cron executa um comando só por
-- job fora de bloco, então cada tabela tem o seu.
do $$
begin
    perform cron.unschedule('vacuum-respostas-pgnet');
exception when others then null;
end $$;

select cron.schedule(
    'vacuum-respostas-pgnet',
    '25 6 * * *',
    $$vacuum (analyze) net._http_response$$
);

do $$
begin
    perform cron.unschedule('vacuum-historico-cron');
exception when others then null;
end $$;

select cron.schedule(
    'vacuum-historico-cron',
    '35 6 * * *',
    $$vacuum (analyze) cron.job_run_details$$
);
