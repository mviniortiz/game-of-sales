-- Agent Builder (landing /v2): o lead cola o site da agência, opcionalmente
-- sobe um material de contexto e informa o e-mail de trabalho; a edge
-- generate-demo-agent gera o blueprint da EVA e captura o lead aqui, em
-- demo_requests, reaproveitando a atribuição e os triggers existentes
-- (demo→deal cria o card no pipeline; SDR outreach NÃO dispara pois não há
-- telefone). Colunas aditivas, backward-compatible.

alter table public.demo_requests
  add column if not exists website text,
  add column if not exists agent_blueprint jsonb,
  add column if not exists agent_used_context boolean not null default false;

comment on column public.demo_requests.website is 'Site informado no Agent Builder da landing (origem do scraping).';
comment on column public.demo_requests.agent_blueprint is 'Blueprint do agente demo gerado pela EVA (gpt) a partir do site/contexto.';
comment on column public.demo_requests.agent_used_context is 'true se o lead subiu material de contexto além do site.';
