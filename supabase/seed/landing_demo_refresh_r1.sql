-- landing_demo_refresh_r1 — higiene do palco da demo da landing (2026-07-28).
-- Conta demo: landing-demo@vyzon.com.br
--   company 93978642-6a81-44e3-a824-95434a196666
--   user    3a4cfef5-98c1-4d1d-9dff-ddca8bde05bf
--   pipeline 2f0c0bc2-0850-4c30-98e6-f66af4e5a53d
-- O seed original congelou em 12-18/jun: Central de Comando abria com R$ 0 no
-- mês, 0 leads e "atualizada há 31d". Este refresh:
--   1) corrige o 403 de follow_up_reminders (GRANT faltando — policy sem grant);
--   2) desloca os dados existentes +40 dias (consistência interna preservada);
--   3) insere ganhos no mês corrente + leads recentes (KPIs vivos);
--   4) renomeia o deal "teste" (visível a qualquer visitante).
-- Aplicar com: npx supabase db query --linked -f supabase/seed/landing_demo_refresh_r1.sql

begin;

-- (1) 403: policies existiam, GRANT não (RLS só roda depois do GRANT)
grant select, insert, update, delete on public.follow_up_reminders to authenticated;
grant all on public.follow_up_reminders to service_role;

-- (2) shift uniforme de +40 dias nos dados da empresa demo
update public.deals
set created_at = created_at + interval '40 days',
    updated_at = updated_at + interval '40 days'
where company_id = '93978642-6a81-44e3-a824-95434a196666';

update public.channel_conversations
set created_at = created_at + interval '40 days',
    updated_at = updated_at + interval '40 days',
    last_message_at = last_message_at + interval '40 days',
    last_inbound_at = last_inbound_at + interval '40 days',
    last_outbound_at = last_outbound_at + interval '40 days'
where company_id = '93978642-6a81-44e3-a824-95434a196666';

update public.channel_messages
set created_at = created_at + interval '40 days',
    updated_at = updated_at + interval '40 days',
    message_timestamp = message_timestamp + interval '40 days'
where company_id = '93978642-6a81-44e3-a824-95434a196666';

-- "Atualizada há 31d" → há 2 dias (mais crível que "agora")
update public.eva_business_context
set updated_at = now() - interval '2 days'
where company_id = '93978642-6a81-44e3-a824-95434a196666';

update public.eva_blueprints
set updated_at = now() - interval '2 days'
where company_id = '93978642-6a81-44e3-a824-95434a196666';

-- (4) deal "teste" vira oportunidade real
update public.deals
set title = 'Identidade visual - Bar do Porto',
    customer_name = 'Bar do Porto'
where company_id = '93978642-6a81-44e3-a824-95434a196666'
  and title = 'teste';

-- (3) ganhos no mês corrente (KPI "Ganho no mês" = stage closed_won +
-- updated_at no mês) e leads recentes ("Novos leads" = created_at 7/14d)
insert into public.deals (company_id, user_id, pipeline_id, title, customer_name, stage, value, created_at, updated_at)
values
  ('93978642-6a81-44e3-a824-95434a196666', '3a4cfef5-98c1-4d1d-9dff-ddca8bde05bf', '2f0c0bc2-0850-4c30-98e6-f66af4e5a53d',
   'Gestão de tráfego - Clínica Vitalle', 'Clínica Vitalle', 'closed_won', 4900.00,
   now() - interval '26 days', now() - interval '19 days'),
  ('93978642-6a81-44e3-a824-95434a196666', '3a4cfef5-98c1-4d1d-9dff-ddca8bde05bf', '2f0c0bc2-0850-4c30-98e6-f66af4e5a53d',
   'Social + tráfego - Ótica Prisma', 'Ótica Prisma', 'closed_won', 7500.00,
   now() - interval '22 days', now() - interval '12 days'),
  ('93978642-6a81-44e3-a824-95434a196666', '3a4cfef5-98c1-4d1d-9dff-ddca8bde05bf', '2f0c0bc2-0850-4c30-98e6-f66af4e5a53d',
   'Landing + tráfego - Espaço Kaia', 'Espaço Kaia', 'closed_won', 3400.00,
   now() - interval '17 days', now() - interval '3 days'),
  ('93978642-6a81-44e3-a824-95434a196666', '3a4cfef5-98c1-4d1d-9dff-ddca8bde05bf', '2f0c0bc2-0850-4c30-98e6-f66af4e5a53d',
   'Tráfego pago - Clínica Sorria Mais', 'Clínica Sorria Mais', 'qualification', 3800.00,
   now() - interval '1 day', now() - interval '1 day'),
  ('93978642-6a81-44e3-a824-95434a196666', '3a4cfef5-98c1-4d1d-9dff-ddca8bde05bf', '2f0c0bc2-0850-4c30-98e6-f66af4e5a53d',
   'Social media - Café Aurora', 'Café Aurora', 'lead', 2200.00,
   now() - interval '3 hours', now() - interval '3 hours');

commit;
