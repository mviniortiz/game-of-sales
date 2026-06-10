# VYZON.AGENTS.1 — Infraestrutura de agentes comerciais assistidos para agências

> **Status:** design (não implementação). Documento de arquitetura de produto.
> **Data:** 2026-06-02.
> **Escopo:** desenhar a evolução do Vyzon de "CRM com EVA" para "central comercial com agentes de IA assistidos" para o nicho de agências.

---

## Princípio inegociável

**Agentes assistidos, não autônomos.** A IA sugere, o humano aprova, o sistema registra/audita/aprende.

Nenhum agente:
- envia mensagem sozinho;
- cria proposta final sem revisão;
- altera deal/pipeline/contato/conversa sem aprovação;
- faz scraping ou prospecção automática;
- promete resultado;
- substitui o vendedor.

Esse princípio já está cristalizado no produto (EVA Studio termina em um selo de "uso assistido", nunca "autônomo") e este documento o estende a todos os agentes.

---

## Resumo executivo

O Vyzon tem hoje uma base sólida e subutilizada: EVA Studio (blueprint persistente, geração por contexto real, aplicação granular segura, memória, simulações persistidas, aprovação formal de uso assistido), Inbox com painel da EVA, regras aplicadas alimentando sugestões no Inbox e no Deal, e um conjunto de tabelas `eva_*` que já modelam contexto, memória, lacunas, sugestões de deal e resultados de simulação.

A tese: **agências vendem no improviso** — perdem follow-up, qualificam mal e não têm padrão comercial. O Vyzon vira a central comercial onde **agentes assistidos** qualificam leads, padronizam follow-up e dão previsibilidade, sempre com o humano no controle.

A estratégia é evoluir o **EVA Studio em Agent Studio**: o mesmo motor (memória + playbooks + regras + simulações + aprovação) passa a configurar *múltiplos agentes especializados* em vez de um único "assistente". O MVP é um agente só — o **Agente Qualificador para Agências** — porque é o de maior dor, menor risco e melhor encaixe com o que já existe (detecção de campos/tags, sugestão de próxima ação, regras aplicadas).

Nada neste documento exige automação nova; tudo se apoia no padrão "sugere → humano revisa → sistema aplica sob confirmação" já implementado.

---

## 1. ICP detalhado

**Quem é:** agências de marketing e serviços digitais brasileiras que vendem por conversa.

| Dimensão | Descrição |
|---|---|
| **Tipo de agência** | Tráfego pago, social media, criação de sites/landing, lançamentos, branding, consultoria de marketing, produtoras de conteúdo, assessorias digitais. |
| **Tamanho** | 3 a 30 pessoas. Comercial feito por 1–5 pessoas (frequentemente o dono + 1 closer + 1 SDR informal). |
| **Canais de aquisição** | WhatsApp (principal), Instagram/DM, formulário de site, indicação, tráfego pago (lead em Meta/Google), eventos e comunidades. Entrada quase toda por **conversa**, não por formulário estruturado. |
| **Ticket médio** | Recorrência (fee mensal) de R$ 1.500 a R$ 15.000/mês, ou projetos pontuais de R$ 3.000 a R$ 50.000. LTV alto, ciclo de venda de dias a poucas semanas. |
| **Maturidade comercial** | Baixa a média. Têm CRM "no nome" mas usam planilha + WhatsApp + memória. Processo na cabeça do dono. Sem playbook escrito, sem SLA de resposta, sem critério de qualificação. |
| **Dores** | Lead frio porque demorou pra responder; qualifica mal e perde tempo com quem não fecha; proposta atrasada; follow-up esquecido; dono é gargalo de toda venda; sem previsibilidade de pipeline. |
| **Objeções** | "Já tenho CRM" (mas não usa); "minha venda é muito consultiva pra IA"; "não quero robô falando com cliente"; "não tenho tempo de configurar"; "meu time não vai adotar". |
| **Por que pagariam** | Responder rápido sem perder o tom; qualificar antes de gastar tempo do closer; nunca esquecer follow-up; padronizar o comercial sem depender do dono; ter previsibilidade de fechamento — **mantendo o controle humano da conversa**. |

**Encaixe com o posicionamento atual:** alinhado ao reposicionamento "Central Comercial com EVA para agências que vendem por conversa" e ao nicho já decidido (agências BR). Proibido vender "automação total" ou "CRM gamificado" como mensagem principal.

---

## 2. Mapa de dores → resposta dos agentes

| Dor | Hoje na agência | Agente que endereça | Como (assistido) |
|---|---|---|---|
| Lead sem resposta | Mensagem some no WhatsApp | Qualificador + Follow-up | Sinaliza lead parado, sugere primeira resposta e SLA |
| Lead mal qualificado | Closer gasta tempo com curioso | Qualificador | Detecta campos faltantes, sugere perguntas, marca verde/amarelo/vermelho |
| Proposta atrasada | Dono "vai fazer depois" | Proposta | Monta rascunho de proposta a partir do contexto, humano revisa e envia |
| Follow-up esquecido | "Esqueci de retornar" | Follow-up | Sugere quando e o que enviar, com cadência por estágio |
| Dono centralizando venda | Tudo passa pelo dono | Gestor + playbooks | Padrão comercial vira regra reutilizável; time executa com sugestão |
| CRM não utilizado | Vendedor não atualiza | Todos | Sugestões aparecem no fluxo (Inbox/Deal), não exigem digitação manual |
| Baixa previsibilidade | "Acho que fecha esse mês" | Gestor | Lê pipeline + atividade, aponta riscos e gargalos |
| Sem playbook comercial | Está na cabeça do dono | Agent Studio (memória/regras) | Operação vira blueprint revisável e versionado |

---

## 3. Arquitetura de agentes

Cinco agentes especializados, todos rodando sobre a mesma infraestrutura comum (seção 4). Cada um é **assistido**: produz sugestões que o humano aprova.

### A) Agente Qualificador
- **Objetivo:** transformar uma conversa crua de lead em um diagnóstico comercial: o que o lead quer, se é ICP, o que falta saber, qual o próximo passo.
- **Entradas:** conversa do canal (WhatsApp/Instagram/form), contexto da empresa (`eva_business_context`), regras aplicadas (`source=eva_studio`), tags existentes, campos do blueprint.
- **Saídas:** campos detectados (orçamento, segmento, urgência, decisor), tags sugeridas, score de qualificação (verde/amarelo/vermelho), perguntas recomendadas, próxima ação sugerida.
- **Regras:** nunca afirma o que não está na conversa; pede confirmação humana antes de gravar campo no deal; respeita "linha vermelha" (não qualifica fora do ICP como quente).
- **Onde aparece:** painel da EVA no Inbox (`EvaPanel`), bloco no `DealCommandCenter`.
- **Critérios de aprovação:** ≥5 simulações testadas, nenhum cenário crítico reprovado, handoff definido, score de validação ≥80%.
- **Riscos:** alucinação de dados (mitigado: só sugere, humano confirma); falso positivo de qualificação (mitigado: cenários críticos `fora_icp`/`objecao_preco`); tom errado para venda consultiva (mitigado: regras de tom por agência).

### B) Agente de Follow-up
- **Objetivo:** garantir que nenhum lead fique sem retorno; sugerir quando e o que enviar.
- **Entradas:** estágio do deal, data da última interação, histórico da conversa, cadência definida nas regras, resultado do Qualificador.
- **Saídas:** lista de leads parados, rascunho de mensagem de follow-up por lead, horário sugerido, motivo do follow-up.
- **Regras:** **não envia** — gera o rascunho; respeita janela de horário comercial; não insiste além do limite definido pela agência; sem emojis se a regra de tom pedir.
- **Onde aparece:** Inbox (fila "precisa de follow-up"), Deal (próxima ação), Central/Performance (resumo de pendências).
- **Critérios de aprovação:** simulações de cadência aprovadas; regra de limite de tentativas configurada; handoff humano para envio.
- **Riscos:** spam percebido (mitigado: limite + aprovação por envio); mensagem genérica (mitigado: usa contexto da conversa); fuso/horário (mitigado: janela configurável).

### C) Agente de Objeções
- **Objetivo:** reconhecer objeção na conversa e sugerir resposta alinhada ao playbook.
- **Entradas:** trecho da conversa, biblioteca de objeções/FAQs (`eva_training_documents`, playbooks), regras de tom, contexto de preço.
- **Saídas:** objeção identificada (preço, prazo, confiança, "vou pensar"), resposta sugerida, materiais/argumentos de apoio, sinal de risco de perda.
- **Regras:** não inventa desconto/condição; não promete resultado; encaminha para humano objeções fora do script.
- **Onde aparece:** Inbox (sugestão contextual quando detecta objeção), Deal.
- **Critérios de aprovação:** cobertura mínima de objeções comuns testadas em simulação; sem promessa de resultado nas respostas; handoff para casos não cobertos.
- **Riscos:** compromisso indevido (mitigado: regras "nunca prometer/descontar"); resposta robótica (mitigado: tom por agência); objeção mal classificada (mitigado: humano revisa antes de enviar).

### D) Agente de Proposta
- **Objetivo:** montar um **rascunho** de proposta a partir do contexto qualificado, para o humano revisar e enviar.
- **Entradas:** campos do deal, escopo discutido na conversa, catálogo de serviços/preços da agência, template de proposta.
- **Saídas:** rascunho estruturado (escopo, entregáveis, investimento sugerido como faixa, condições), checklist do que falta confirmar.
- **Regras:** **nunca finaliza/envia**; preço sempre como sugestão revisável; não cria condição comercial não autorizada; marca claramente "rascunho — revisar".
- **Onde aparece:** Deal (`DealCommandCenter`), futura tela de proposta.
- **Critérios de aprovação:** template aprovado pela agência; faixas de preço configuradas; revisão humana obrigatória no fluxo.
- **Riscos:** preço errado (mitigado: faixa + revisão); escopo incompleto (mitigado: checklist do que falta); parecer oferta oficial (mitigado: selo "rascunho").

### E) Agente Gestor
- **Objetivo:** dar ao dono/gestor leitura da operação: onde está travando, quem precisa de atenção, previsibilidade.
- **Entradas:** pipeline, metas (`/metas`), atividades, resultados dos outros agentes, histórico de avanço de estágio.
- **Saídas:** resumo de saúde do funil, leads/deals em risco, gargalos por estágio, recomendações de priorização, alerta de SLA estourado.
- **Regras:** só leitura e recomendação; não reatribui deal nem move estágio sozinho; foca em decisão humana.
- **Onde aparece:** Dashboard/Performance, Central (`/eva`), resumo no topo do pipeline.
- **Critérios de aprovação:** métricas validadas contra dados reais; sem ação executável automática.
- **Riscos:** conclusão enviesada por dado incompleto (mitigado: mostra base do cálculo); microgerência por alertas demais (mitigado: priorização + limites).

---

## 4. Infraestrutura comum dos agentes

Camadas compartilhadas. A maior parte já existe como tabelas/hooks `eva_*`; o trabalho é generalizar de "EVA" para "agente N".

| Camada | O que é | Onde já vive hoje |
|---|---|---|
| **Memória** | Contexto acumulado da operação por empresa | `eva_memory`, `eva_business_context`, hook `useEvaMemory` |
| **Playbooks** | Roteiros/guias comerciais reutilizáveis | `eva_business_context.playbooks` (kind=playbook) |
| **Regras** | Diretrizes que orientam sugestões (tom, limites, linhas vermelhas) | regras `source=eva_studio`, hook `useEvaStudioRules` |
| **Fontes** | CRM, WhatsApp, base de conhecimento, pipeline, tags, FAQs | `eva_training_documents`, tags, deals, channel_conversations |
| **Simulações** | Cenários determinísticos para testar o agente antes do uso | `eva_simulation_results`, `src/lib/eva/scenarios.ts` |
| **Critérios de aprovação** | Score + travas (handoff, crítico reprovado, mínimo de testes) | `src/lib/eva/approval.ts` |
| **Auditoria** | Quem aprovou, quando, o que foi aplicado | `eva_blueprints` (applied_*, approved_by/at), `eva_deal_suggestions` |
| **Permissões** | Admin configura/aprova; membro usa em modo leitura | `canEdit` via `useAuth().isAdmin`, RLS por empresa |
| **Uso assistido** | Selo formal que libera o agente para sugerir na operação | status `approved_assisted` |
| **Handoff humano** | Regra explícita de quando passa para pessoa | critério em `approval.ts` (detecção de handoff nas regras) |
| **Logs de sugestão** | Toda sugestão registrada (aceita/rejeitada) | `eva_deal_suggestions`, `eva_context_suggestions` (a generalizar) |
| **Feedback do usuário** | Aprovou/ajustou/reprovou + observação | feedback nas simulações (`eva_simulation_results.feedback`) |

**Generalização proposta (design, não migração agora):** introduzir o conceito de `agent_key` (qualifier/followup/objection/proposal/manager) como dimensão nas tabelas que hoje são "EVA única" (blueprints, simulações, logs de sugestão), preservando o singleton atual como `agent_key='qualifier'` na migração futura. Sem isso agora; é a direção.

---

## 5. Como o EVA Studio vira Agent Studio

Reorganização conceitual (a EVA continua sendo a camada/marca-mãe; "agentes" são especializações dela, não marcas novas):

| Aba atual | Vira | Mudança |
|---|---|---|
| **Studio** | **Studio de agentes** | Seletor de agente no topo; cada agente tem seu blueprint, regras e estado. Começa com 1 (Qualificador). |
| **Memória** | **Base comum** | Permanece compartilhada entre agentes (fonte única da operação). |
| **Simulações** | **Teste por agente** | Cenários filtrados pelo agente selecionado. |
| **Insights** | **Riscos e melhorias** | Aponta lacunas e riscos por agente + visão consolidada. |
| (selo de aprovação) | **Aprovação** | Cada agente é liberado individualmente para uso assistido. |

Princípio de migração: **não quebrar o EVA Studio atual**. O Qualificador É o EVA Studio de hoje renomeado conceitualmente; os demais agentes entram como novas entradas no seletor, sem refatorar o que funciona.

---

## 6. Primeiro agente do MVP — Agente Qualificador para Agências

Escolhido por: maior dor, menor risco, reaproveita ~90% do que já existe.

- **Campos que detecta:** segmento/nicho do lead, serviço desejado (tráfego/social/site/lançamento), orçamento ou faixa, urgência, quem decide, canal de origem, faturamento/porte aproximado, prazo desejado.
- **Tags que sugere:** `lead-quente`, `lead-morno`, `lead-frio`, `fora-do-icp`, `sem-orcamento`, `precisa-followup`, `decisor`, `indicacao`, + tags por serviço.
- **Perguntas que recomenda:** "Qual resultado você espera nos próximos 90 dias?", "Já investe em tráfego/marketing hoje? Quanto?", "Quem decide a contratação?", "Qual prazo para começar?", "Já trabalhou com agência antes? Como foi?".
- **Critérios de lead qualificado (verde):** dentro do ICP + orçamento compatível + decisor identificado + necessidade clara + prazo definido. Amarelo: falta 1–2. Vermelho/fora: fora do ICP ou sem orçamento e sem decisor.
- **Critérios de handoff:** lead quente → notifica humano para assumir; objeção fora do script → humano; pedido de proposta → Agente de Proposta (rascunho) + humano; qualquer envio → humano.
- **Simulações obrigatórias (mínimo 5):** lead dentro do ICP completo; lead sem orçamento; lead fora do ICP (crítico); lead pedindo preço de cara (objeção, crítico); lead por indicação; lead urgente; lead curioso sem intenção. (Base já existe em `scenarios.ts` — adaptar rótulos para agência.)
- **Onde aparece:** `EvaPanel` no Inbox (diagnóstico + perguntas + próxima ação) e bloco no `DealCommandCenter`.

---

## 7. Limites e segurança (explícito)

- **Não envia mensagem sozinho** — só gera rascunho/sugestão.
- **Não cria proposta final sem revisão** — proposta é sempre rascunho marcado.
- **Não altera deal sem aprovação** — campos/tags só gravam após confirmação humana.
- **Não faz scraping nem prospecção automática** — opera só sobre dados que entraram na operação (conversas, notas, CRM). Proibido enriquecer via Google/LinkedIn.
- **Não promete resultado** — regra dura nas respostas de objeção/proposta.
- **Não substitui o vendedor** — assiste; o humano conduz a conversa e decide.
- **Escopo por empresa (RLS)** e **edição só por admin** (`canEdit`).

---

## 8. Roadmap em fases

| Fase | Entrega | Risco | Reuso |
|---|---|---|---|
| **1** | Agente Qualificador assistido (MVP) | Baixo | ~90% do EVA Studio atual |
| **2** | Follow-up assistido (fila + rascunho, sem envio) | Médio (cadência) | Inbox + regras |
| **3** | Objeções + Proposta (rascunho) | Médio | Playbooks + templates |
| **4** | Agente Gestor (leitura/recomendação) | Baixo | Pipeline + metas + Performance |
| **5** | Campanhas assistidas / prospecção **assistida** (humano dispara) | Alto | Requer design dedicado e novo consentimento |

A Fase 5 é assistida: o sistema pode *sugerir* listas/abordagens a partir de dados internos, mas o disparo é sempre humano e nunca há scraping automático.

---

## 9. Implicações no produto atual

| Surface | Existe hoje | Precisa mudar (design) |
|---|---|---|
| **EVA Studio** (`/eva-studio`) | Blueprint, memória, simulações, aprovação | Vira Agent Studio: seletor de agente; blueprint/regras/simulações por agente; aprovação individual. Sem refatorar o motor. |
| **Inbox** (`/inbox`, `EvaPanel`) | Painel da EVA + regras aplicadas | Mostrar diagnóstico do Qualificador (campos/score/perguntas) e ações de aceitar/ajustar com log de sugestão. |
| **Pipeline** (`/pipeline`) | Funil visual | Sinalizar leads em risco/parados (input do Gestor e Follow-up); badge de qualificação. |
| **Deal** (`/deals/:id`, `DealCommandCenter`) | Próxima ação + regras EVA | Bloco de qualificação; rascunho de proposta (Fase 3); aceitar sugestão grava campo só após confirmação. |
| **Central** (`/eva`) | Assistente central | Resumo do Gestor + atalhos para agentes; visão de pendências assistidas. |
| **Performance** (`/performance`) | Métricas | Acrescentar métricas de agente (seção 10): tempo de 1ª resposta, % qualificados, follow-ups feitos. |
| **Landing / copy** | "Central comercial com EVA" | Evoluir para "agentes assistidos para agências", sem prometer automação total nem resultado; validar features no código antes da copy. |
| **Dados demo** | "Agência Metria Growth" | Popular conversas de lead realistas de agência (tráfego/social/site) para simulações e demo do Qualificador. |

Mudanças de schema implicadas (a especificar em VYZON.AGENTS.2, não agora): dimensão `agent_key`; tabela de logs de sugestão generalizada com status aceito/ajustado/rejeitado + feedback. Tudo aditivo, com GRANT + RLS por empresa, aplicado via `db query --linked -f` (nunca `db push`).

---

## 10. Critérios de sucesso (métricas)

| Métrica | Definição | Por que importa |
|---|---|---|
| **Tempo de 1ª resposta** | Mediana entre entrada do lead e primeira resposta humana | Mede a dor central (lead frio) |
| **% leads qualificados** | Leads com diagnóstico verde/amarelo aceito ÷ total | Mede valor do Qualificador |
| **Follow-ups realizados** | Follow-ups sugeridos que foram enviados (aprovados) | Mede combate ao esquecimento |
| **Oportunidades criadas** | Deals abertos a partir de leads qualificados | Topo de funil saudável |
| **Propostas enviadas** | Rascunhos revisados e enviados | Mede desbloqueio do gargalo de proposta |
| **Visitas/reuniões agendadas** | Compromissos marcados via sugestão | Avanço comercial concreto |
| **Leads sem resposta** | Leads parados acima do SLA | Métrica de alerta (quanto menor, melhor) |
| **Taxa de avanço no pipeline** | % de deals que mudam de estágio por período | Previsibilidade |

Métrica-âncora do MVP: **tempo de 1ª resposta** + **% leads qualificados**. Se essas duas melhoram, a tese se sustenta.

---

## Recomendações de implementação

1. **Renomear conceitualmente, não reescrever.** Tratar o EVA Studio atual como o Agente Qualificador. Introduzir o seletor de agente com 1 item antes de criar qualquer agente novo.
2. **MVP = só Qualificador.** Adaptar `scenarios.ts` para cenários de agência; ajustar campos/tags/perguntas da seção 6; reaproveitar `approval.ts` e o selo `approved_assisted`.
3. **Generalizar o log de sugestão cedo.** É a base de auditoria e aprendizado; já existem `eva_deal_suggestions`/`eva_context_suggestions` para evoluir.
4. **Dados demo de agência primeiro.** Sem conversas realistas, simulação e demo não convencem o ICP.
5. **Copy só depois da feature.** Validar no código antes de prometer na landing (regra de produto já estabelecida).

## Riscos

- **Excesso de escopo:** tentar entregar 5 agentes de uma vez. Mitigação: roadmap em fases, MVP de 1.
- **Percepção de "robô":** ICP teme IA falando com cliente. Mitigação: reforçar "assistido, humano aprova" em toda superfície.
- **Schema prematuro:** mexer em tabelas antes do design fechar. Mitigação: `agent_key` e logs ficam para VYZON.AGENTS.2, aditivos.
- **Promessa de resultado:** risco legal/posicionamento. Mitigação: regra dura nos agentes de Objeção/Proposta.
- **Adoção:** se a sugestão não aparecer no fluxo (Inbox/Deal), ninguém usa. Mitigação: sugestões no contexto, sem digitação extra.

## Próximos passos

1. **VYZON.AGENTS.2** — especificação técnica do Agente Qualificador: schema aditivo (`agent_key`, log de sugestões), cenários de agência, contrato dos hooks.
2. Adaptar `src/lib/eva/scenarios.ts` para o contexto de agências (rótulos e campos da seção 6).
3. Desenhar o seletor de agente no EVA Studio (1 agente, sem refatorar o motor).
4. Popular dados demo de agência (conversas de lead realistas) na "Agência Metria Growth".
5. Definir instrumentação das 2 métricas-âncora (tempo de 1ª resposta, % qualificados) antes de codar o agente.
