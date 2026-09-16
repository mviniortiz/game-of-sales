-- VYZON.AGENTS.4 (2026-08-24) — Mais mãos para a EVA.
--
-- O catálogo tinha 4 tools: ler contexto, mover estágio, criar nota e
-- rascunhar mensagem. Com isso o agente não conseguia fechar nenhum ciclo
-- sozinho: não abria card, não marcava perda, não agendava retomada e não
-- enxergava a leitura que a própria EVA já tinha feito da conversa.
--
-- Todas internas (executam sozinhas). A única tool que fala com o lead
-- continua sendo draft_outbound_message, que só produz rascunho.
--
-- Implementação no switch de dispatch da edge eva-agent-loop.
--
-- Aplicar via:
--   npx supabase db query --linked -f supabase/migrations/20260824_agent_tools_expansion.sql

insert into public.agent_tools (tool_key, name, description, kind, parameters_schema)
values
  ('create_deal',
   'Abrir oportunidade',
   'Cria o card no pipeline a partir de um lead que apareceu na conversa. Idempotente por telefone: se ja existe card com o mesmo numero, devolve o existente em vez de duplicar. Interna.',
   'internal',
   '{"type":"object","properties":{"customer_name":{"type":"string","description":"Nome do lead"},"customer_phone":{"type":"string","description":"Telefone com DDD, so digitos"},"title":{"type":"string","description":"Titulo do card. Sem isso usa o nome do lead"},"stage":{"type":"string","description":"Estagio inicial. Padrao qualification"},"notes":{"type":"string","description":"Contexto curto do que o lead pediu"}},"required":["customer_name"]}'::jsonb),

  ('mark_deal_lost',
   'Marcar oportunidade como perdida',
   'Move o card para closed_lost com o motivo da perda e zera a probabilidade. Use quando o lead recusou, sumiu apos varias tentativas ou fechou com concorrente. Interna.',
   'internal',
   '{"type":"object","properties":{"deal_id":{"type":"string"},"loss_reason":{"type":"string","description":"Motivo em pt-BR, uma frase"}},"required":["deal_id","loss_reason"]}'::jsonb),

  ('schedule_followup',
   'Agendar retomada',
   'Cria lembrete com data e hora para o dono do card retomar a conversa. Use quando o lead pediu para falar depois. Interna.',
   'internal',
   '{"type":"object","properties":{"deal_id":{"type":"string"},"title":{"type":"string","description":"O que precisa ser feito"},"remind_at":{"type":"string","description":"Data e hora em ISO 8601, sempre no futuro"},"description":{"type":"string","description":"Contexto para quem for retomar"}},"required":["deal_id","title","remind_at"]}'::jsonb),

  ('log_deal_activity',
   'Registrar atividade no card',
   'Grava no historico do card o que aconteceu: ligacao feita, email enviado, reuniao marcada. Interna.',
   'internal',
   '{"type":"object","properties":{"deal_id":{"type":"string"},"activity_type":{"type":"string","enum":["note_added","call_made","email_sent","meeting_scheduled","field_updated"]},"description":{"type":"string","description":"O que aconteceu, uma frase em pt-BR"}},"required":["deal_id","activity_type"]}'::jsonb),

  ('get_conversation_summary',
   'Ler o resumo da conversa',
   'Devolve a leitura que a EVA ja fez do atendimento: resumo, temperatura, objecoes e proximo passo sugerido. Aceita deal_id ou chat_phone. Interna, sem efeito colateral.',
   'internal',
   '{"type":"object","properties":{"deal_id":{"type":"string"},"chat_phone":{"type":"string","description":"Telefone do lead, so digitos"}}}'::jsonb),

  ('list_deals_needing_attention',
   'Listar cards parados',
   'Lista oportunidades abertas sem movimento ha X dias, da mais antiga para a mais nova. E por onde o agente escolhe onde agir quando nao recebeu um deal especifico. Interna, sem efeito colateral.',
   'internal',
   '{"type":"object","properties":{"stale_days":{"type":"number","description":"Dias sem movimento. Padrao 3"},"limit":{"type":"number","description":"Maximo de cards. Padrao 10, teto 25"}}}'::jsonb)
on conflict (tool_key) do update
  set name              = excluded.name,
      description       = excluded.description,
      kind              = excluded.kind,
      parameters_schema = excluded.parameters_schema,
      enabled           = true,
      updated_at        = now();

do $$
declare
    v_total integer;
begin
    select count(*) into v_total from public.agent_tools where enabled;
    raise notice 'VYZON.AGENTS.4 aplicado: catalogo com % tools ativas.', v_total;
end $$;
