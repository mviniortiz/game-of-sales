-- landing_demo_refresh_r3 — kanban da demo vazio (2026-07-28).
-- O board multi-pipeline renderiza por deals.stage_id; os deals da conta demo
-- (originais e os inseridos no r1) só tinham o stage LEGADO → "0 oportunidades".
-- Dual-write que faltou: stage_id resolvido pelo legacy_key do próprio pipeline.
-- Aplicar com: npx supabase db query --linked -f supabase/seed/landing_demo_refresh_r3.sql

update public.deals d
set stage_id = s.id
from public.pipeline_stages s
where d.company_id = '93978642-6a81-44e3-a824-95434a196666'
  and s.pipeline_id = d.pipeline_id
  and s.legacy_key = d.stage
  and d.stage_id is null;

-- expected_close_date ficou fora do shift do r1 ("Venceu 30 jun" no card):
-- empurra pro futuro próximo qualquer previsão já vencida da conta demo.
-- (guard "< current_date" torna o statement seguro pra re-execução)
update public.deals
set expected_close_date = current_date + ((3 + (abs(hashtext(id::text)) % 12)) || ' days')::interval
where company_id = '93978642-6a81-44e3-a824-95434a196666'
  and expected_close_date is not null
  and expected_close_date < current_date;
