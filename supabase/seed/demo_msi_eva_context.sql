-- ─────────────────────────────────────────────────────────────────────────────
-- DEMO.MSI.CTX (2026-06-12) — Contexto da EVA (perfil distribuidora MSI) +
-- templates de mensagem de exemplo, para a company demo.
--
-- Reescreve eva_business_context da company demo do perfil "agência de tráfego"
-- para "distribuidora B2B (MSI Comércio)", pra a EVA recomendar de acordo. E
-- cria templates de mensagem (saudação, follow-up, proposta, cobrança).
--
-- Rodar: npx supabase db query --linked -f supabase/seed/demo_msi_eva_context.sql
-- IDEMPOTENTE: UPDATE do singleton + delete/insert dos templates por marcador.
-- ─────────────────────────────────────────────────────────────────────────────
DO $do$
DECLARE
  v_company uuid := '7e2e21ac-d834-448b-a61b-79ca01255702';
  v_owner   uuid;
BEGIN
  SELECT id INTO v_owner FROM public.profiles WHERE company_id = v_company ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'Sem profile na company %', v_company; END IF;

  -- ── Contexto da EVA → perfil distribuidora MSI ──────────────────────────────
  UPDATE public.eva_business_context
     SET agency = $j$
       {
         "descricao": "MSI Comércio é uma distribuidora B2B (atacado) que abastece farmácias, drogarias, mercados, mini-mercados, lojas de variedades e importados. Vendemos por pedido, com pronta entrega na região e condições de pagamento parceladas. O foco é recompra e relacionamento de longo prazo com o varejo.",
         "tom_de_voz": "Direto, cordial e objetivo, de quem entende de abastecimento e giro de estoque. Sem emojis e sem gírias. Sempre orientado a fechar o pedido e facilitar a recompra.",
         "observacoes": "Operação comercial por carteira de clientes. A maior alavanca é resgatar follow-ups e reativar clientes parados (Stand By / Inativos).",
         "publico_alvo": "Farmácias, drogarias, mercados, mini-mercados, lojas de variedades, importados e atacados de pequeno e médio porte com CNPJ ativo.",
         "ticket_medio": "8.000",
         "regras_handoff": "Passar para um vendedor humano quando o cliente pedir condição fora da tabela, prazo acima de 90 dias, ou pedido acima de R$ 50 mil.",
         "palavras_proibidas": ["mais barato do mercado", "imbatível", "exclusivo"],
         "horario_atendimento": {"dias": "Seg a Sex", "inicio": "08:00", "fim": "18:00", "fuso": "America/Sao_Paulo"},
         "promessas_proibidas": [
           "Proibido prometer prazo de entrega sem confirmar estoque",
           "Proibido garantir desconto sem aprovação do gestor"
         ]
       }
       $j$::jsonb,
       services = $j$
       [
         {
           "id": "svc_msi_genericos",
           "nome": "Genéricos e medicamentos",
           "descricao": "Linha de genéricos e medicamentos para farmácias e drogarias, com pronta entrega.",
           "modelo_cobranca": "por pedido",
           "preco_min": 2000,
           "preco_max": 120000,
           "perguntas_obrigatorias": [
             "Qual o CNPJ e o tipo de loja (farmácia, drogaria, mercado)?",
             "Qual o volume de compra mensal aproximado?",
             "Com que frequência você costuma repor o estoque?"
           ],
           "objecoes": ["Já tenho fornecedor", "Preço da concorrência", "Prazo de pagamento curto"],
           "criterios_bom_fit": ["CNPJ ativo", "Compra recorrente mensal", "Está na região de entrega"],
           "criterios_baixo_fit": ["Pessoa física sem CNPJ", "Compra avulsa de baixo valor"]
         },
         {
           "id": "svc_msi_perfumaria",
           "nome": "Perfumaria e higiene",
           "descricao": "Perfumaria, higiene pessoal e cuidados, para drogarias e mercados.",
           "modelo_cobranca": "por pedido",
           "preco_min": 1500,
           "preco_max": 60000,
           "perguntas_obrigatorias": ["Qual o mix que mais gira na sua loja?", "Qual o volume mensal estimado?"],
           "objecoes": ["Falta de espaço", "Giro baixo"],
           "criterios_bom_fit": ["Loja de bairro com bom fluxo", "Recompra mensal"],
           "criterios_baixo_fit": ["Sem CNPJ"]
         },
         {
           "id": "svc_msi_descartaveis",
           "nome": "Descartáveis e embalagens",
           "descricao": "Descartáveis, embalagens e itens de uso para mercados, lanchonetes e lojas.",
           "modelo_cobranca": "por pedido",
           "preco_min": 1000,
           "preco_max": 40000,
           "perguntas_obrigatorias": ["Você compra para quantas lojas?", "Prefere entrega programada (semanal/quinzenal)?"],
           "objecoes": ["Preço por unidade", "Pedido mínimo"],
           "criterios_bom_fit": ["Consumo recorrente", "Mais de uma loja"],
           "criterios_baixo_fit": ["Compra única"]
         },
         {
           "id": "svc_msi_variedades",
           "nome": "Variedades e importados",
           "descricao": "Variedades, utilidades e importados para lojas de 1,99, presentes e bazares.",
           "modelo_cobranca": "por pedido",
           "preco_min": 1000,
           "preco_max": 50000,
           "perguntas_obrigatorias": ["Qual o perfil da sua loja?", "Qual ticket de pedido você costuma fazer?"],
           "objecoes": ["Quero ver mostruário", "Margem"],
           "criterios_bom_fit": ["Loja de variedades ativa", "Recompra frequente"],
           "criterios_baixo_fit": ["Consumidor final"]
         }
       ]
       $j$::jsonb,
       icp = $j$
       {
         "descricao": "Varejo com CNPJ ativo e giro recorrente: farmácias, drogarias, mercados, mini-mercados e lojas de variedades que compram pelo menos mensalmente e estão na região de entrega. BOM FIT: pedido recorrente acima de R$ 3 mil/mês, recompra previsível, decisor de compras acessível. SEM FIT: consumidor final, pessoa física sem CNPJ, compra avulsa de baixo valor ou fora da região de entrega."
       }
       $j$::jsonb,
       version = version + 1,
       last_edited_by = v_owner,
       updated_at = now()
   WHERE company_id = v_company;

  IF NOT FOUND THEN
    INSERT INTO public.eva_business_context (company_id, agency, services, icp, version, last_edited_by)
    VALUES (v_company, '{}'::jsonb, '[]'::jsonb, '{}'::jsonb, 1, v_owner);
    RAISE NOTICE 'eva_business_context não existia; criado vazio. Rode o seed de novo para preencher.';
  END IF;

  -- ── Templates de mensagem (whatsapp_templates) ──────────────────────────────
  DELETE FROM public.whatsapp_templates WHERE company_id = v_company AND name LIKE '[MSI]%';

  INSERT INTO public.whatsapp_templates (company_id, name, category, content, created_by) VALUES
    (v_company, '[MSI] Saudação / abertura', 'saudacao',
     'Olá, {{nome}}! Aqui é da MSI Comércio. Trabalhamos com distribuição para o varejo com pronta entrega na sua região. Posso te enviar nossa tabela e condições?', v_owner),
    (v_company, '[MSI] Follow-up de pedido parado', 'follow-up',
     'Oi, {{nome}}, tudo bem? Voltando aqui sobre o pedido que ficamos de fechar. Seguro a condição combinada e já deixo tudo pronto pra faturar essa semana. Consegue confirmar?', v_owner),
    (v_company, '[MSI] Reativação de cliente inativo', 'follow-up',
     'Olá, {{nome}}! Faz um tempo que não fazemos um pedido juntos. Atualizei a tabela com condições melhores pro seu giro. Quer que eu monte um pedido inicial pra você avaliar?', v_owner),
    (v_company, '[MSI] Envio de proposta / tabela', 'proposta',
     'Perfeito, {{nome}}! Pelo seu volume, consigo a seguinte condição: pagamento em 30/60/90 e entrega programada. Te envio a proposta detalhada agora. Posso seguir?', v_owner),
    (v_company, '[MSI] Cobrança / fechamento', 'cobranca',
     'Oi, {{nome}}! A condição do seu pedido (valor {{valor_deal}}) está reservada até sexta. Quer que eu finalize agora pra garantir o preço e a entrega?', v_owner);

  RAISE NOTICE 'DEMO.MSI.CTX aplicada: contexto MSI + 5 templates na company %.', v_company;
END
$do$;
