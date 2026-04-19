-- Add qualifying fields to demo_requests (wizard step 2)
alter table public.demo_requests
  add column if not exists team_size text,
  add column if not exists uses_spreadsheets boolean,
  add column if not exists biggest_pain text,
  add column if not exists improvement_goal text;

comment on column public.demo_requests.team_size is 'Faixa de tamanho do time comercial: 1-3 | 4-10 | 11-30 | 30+';
comment on column public.demo_requests.uses_spreadsheets is 'Usa planilhas hoje para controlar o time comercial';
comment on column public.demo_requests.biggest_pain is 'Maior dor/desafio atual na gestão comercial (resposta livre ou chip pré-definido)';
comment on column public.demo_requests.improvement_goal is 'O que o prospect deseja melhorar na empresa dele';
