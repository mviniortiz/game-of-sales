# VYZON.AGENTS.3 — EVA Operadora: autonomia interna conquistada por confiança

> **Status:** spec de produto (aprovada para especificação em 2026-07-04; implementação faseada).
> **Antecede:** VYZON.AGENTS.1 (infraestrutura de agentes assistidos) e VYZON.AGENTS.2 (Agente Qualificador).
> **Muda o quê:** evolui o princípio "a EVA sugere, o time aprova" para **"a EVA opera por dentro, o time fala por fora"** — autonomia REAL, mas só no trabalho interno, desbloqueada por métrica de confiança, com prestação de contas e undo universal.

---

## 1. O gap de mercado (por que agora, por que nós)

O mercado de agentes de IA para vendas em 2026 apostou quase inteiro numa única coisa: **o envio autônomo** (AI SDRs que escrevem e disparam mensagens sozinhos). O resultado é público e mensurável:

- Churn anual da categoria AI SDR em 50–70% (um vendor conhecido: ~80%).
- Texto gerado por IA é flagrado por filtros de spam em mais que o dobro da taxa humana; quando o volume sobe ~6,4x, a taxa de resposta cai ~38% e a reputação do domínio derrete.
- Compradores reconhecem "textura de IA" e arquivam sem ler; para líderes de receita, a barreira nº 1 não é custo, é **risco de marca**.
- O consenso que emergiu: modelos human-in-the-loop performam melhor que autonomia total — "a versão híbrida chata é a que funciona".

**Onde todos pecam:** automatizaram a parte de MAIOR risco e MENOR dor (falar com o lead — que o dono de agência até gosta de fazer) e ignoraram a parte de maior dor e menor risco: **o trabalho invisível entre as conversas** — triagem, qualificação, roteamento, atualização de pipeline, agendamento de follow-up, etiquetagem, handoff. É o trabalho que ninguém quer fazer, que ninguém faz direito às 23h de sexta, e que é o motivo real de o CRM médio estar sempre mentindo.

**Nossa vantagem estrutural:** nossa marca JÁ é "a EVA sugere, seu time aprova". Concorrentes que queimaram a mão com autonomia externa não conseguem pivotar pra "confiança gradual" sem se desdizer. Nós conseguimos ESTENDER sem contradizer: a fala continua humana; a operação vira autônoma.

**A tese em uma frase:** *o primeiro funcionário digital de operações comerciais que conquista autonomia como um funcionário de verdade — provando, tarefa por tarefa, que faz certo.*

---

## 2. Conceito: EVA Operadora

Dois hemisférios com regras diferentes:

| | **Por dentro (operação)** | **Por fora (conversa)** |
|---|---|---|
| O que é | Triagem, qualificação, card, estágio, roteamento, follow-up interno, tags, dossiê | Qualquer mensagem ao lead, proposta, preço, fechar/perder |
| Autonomia | **Graduada pela Trust Ladder** (pode chegar a autônoma) | **Nunca autônoma** (aprovar-e-enviar, sempre) |
| Analogia | As mãos e a memória da operação | A voz da agência |

Isso é compatível com o modelo híbrido vigente (decisão de produto 2026-06-12), que já permite trabalho interno automático sobre dado que já chegou. A novidade não é a permissão — é o **mecanismo de confiança** que transforma a permissão em produto.

### Posicionamento externo (linguagem BR, sem "agente autônomo")

- "A EVA arruma a casa sozinha. Falar com o lead continua com você."
- "Seu pipeline atualizado às 2h da manhã, sem ninguém do time acordado."
- "A EVA ganha autonomia como um funcionário novo: provando que faz certo."
- Proibido em copy: "agente autônomo", "IA que vende sozinha", "substitui SDR".

---

## 3. Trust Ladder — autonomia conquistada por dados

O coração da spec. Autonomia não é um toggle; é um **estado por CLASSE de ação, por conta**, que sobe e desce com evidência.

### Níveis

- **L0 — Sugere.** Comportamento atual: a EVA propõe, humano aplica. Toda conta/classe nasce aqui.
- **L1 — Executa e avisa (undo).** A EVA executa a ação, notifica de forma passiva (feed + digest) e mantém **undo de 1 toque por 72h**. Nada é pedido ao humano antes; tudo é reversível depois.
- **L2 — Executa e presta contas.** A EVA executa em silêncio; a ação aparece só no ledger e no digest diário. Undo continua disponível.

### Gates (subida)

Uma classe sobe de nível quando, **naquela conta**:

- L0 → L1: taxa de aprovação (aceitas + ajustadas leves) ≥ **95%** nas últimas **4 semanas**, com **n ≥ 30** sugestões da classe; upgrade proposto ao admin com os números ("nas últimas 4 semanas você aprovou 97% das 61 qualificações da EVA — quer que ela passe a aplicar sozinha, com undo?"). **O admin sempre dá o OK final do upgrade** — autonomia é oferecida, nunca imposta.
- L1 → L2: taxa de undo ≤ **2%** por mais 4 semanas em L1, mesmo fluxo de oferta.

### Rebaixamento (automático, sem pedir licença)

- Undo rate > 5% na janela móvel de 2 semanas → desce um nível na hora + notificação com o motivo.
- Admin pode rebaixar ou travar qualquer classe em L0, a qualquer momento, sem fricção ("modo manual").

### Por que isso é diferenciação e não feature

A taxa de aprovação que alimenta os gates **já é coletada** (`agent_suggestions.status` + EVA Analytics). Concorrente que não passou pelos meses de operação assistida não tem o dado pra construir a escada — precisaria lançar autonomia "no escuro" (e é exatamente isso que está matando a categoria). Nosso período "só sugestão" deixa de ser limitação e vira **o dataset que compra a autonomia**. Moat de dado + moat de narrativa.

---

## 4. Classes de ação (v1)

Cada classe tem: gatilho, ação, payload auditável, undo definido.

| Classe | Ação autônoma (em L1/L2) | Undo |
|---|---|---|
| `triage` | Lead novo inbound: deduplicar contato, vincular conversa, descartar ruído óbvio (grupo/pessoal fora do modo prospecção) | Restaurar vínculo/estado anterior |
| `qualify_card` | Criar/atualizar card com campos detectados (orçamento, urgência, decisor…), score e leitura da EVA | Reverter pro snapshot anterior do card |
| `route` | Atribuir a oportunidade ao vendedor certo (regras do playbook: carteira, rodízio, especialidade) | Reatribuir ao estado anterior |
| `stage_sync` | Mover estágio quando a CONVERSA evidencia (ex.: lead aceitou proposta → "Negociação") | Voltar estágio |
| `followup_task` | Criar tarefa/lembrete interno de follow-up com prazo do playbook (não envia nada) | Apagar tarefa |
| `tagging` | Aplicar/remover tags conforme critérios aprovados | Reverter tags |

**Linhas vermelhas (nunca entram na Ladder):** enviar/editar/agendar mensagem externa; criar/alterar proposta ou preço; marcar deal como ganho/perdido; deletar dados; alterar configurações; qualquer coisa fora do tenant.

---

## 5. Prestação de contas (o segundo diferencial)

Agentes do mercado não se reportam — são caixas-pretas com dashboard. A EVA Operadora se comporta como funcionária:

1. **Ledger** (`agent_actions`): toda execução autônoma gravada com classe, payload aplicado, snapshot pré-ação (pro undo), evidência ("por quê": trecho da leitura, nunca a mensagem crua — regra de privacidade vigente), nível na hora da ação, e resultado do undo se houver.
2. **Diário da EVA** (digest): todo dia útil, no Início + (opcional) canal do time via `notify-channel`: *"Ontem: qualifiquei 14 leads, criei 9 cards, roteei 6, agendei 11 follow-ups. Precisei de você em 2 casos (fila de aprovação). 1 ação desfeita — ajustei o critério."*
3. **Feed de ações** com undo de 1 toque, agrupado por dia, filtrável por classe.
4. **Página de confiança** (no EVA Studio): a Ladder visível por classe — nível atual, taxa de aprovação, o que falta pro próximo nível. O admin VÊ a EVA conquistando autonomia. Isso é UI de produto e argumento de venda ao mesmo tempo.

---

## 6. Arquitetura (o que reusa, o que nasce)

**Reusa (≈80%):**
- Cérebro: Agente Qualificador (VYZON.AGENTS.2) — detecção de campos, score, próxima ação.
- `agent_suggestions` (pending → accepted/adjusted/rejected/expired + applied_payload + feedback) — continua sendo o trilho de L0 e a FONTE dos gates.
- `eva-analytics-summary` — taxa de aprovação por classe (já é a métrica-mãe).
- Webhook de ingestão (`evolution-message-webhook` → RPC), triggers pg_net, `notify-channel`, RLS por `company_id`.

**Nasce:**
- `agent_actions` (ledger, com snapshot pré-ação) + `agent_trust` (nível por conta×classe + janelas de métrica). Migrations aditivas, GRANT antes de RLS, padrão do projeto.
- Motor de execução: a MESMA geração que hoje vira sugestão passa, em L1/L2, a aplicar o payload via RPC transacional (aplica + grava ledger + snapshot num commit).
- Serviço de gates: job (pg_cron ou edge agendada) que recalcula janelas e propõe upgrades / executa rebaixamentos.
- UI: feed de ações + digest + página de confiança + toggles do admin.

**Decisões deliberadas:**
- Undo por snapshot (não event-sourcing): simples, suficiente pra 72h, ponytail-correto.
- Gate por CLASSE×CONTA (não global): confiança não transfere entre tarefas nem entre clientes.
- Upgrade sempre opt-in do admin; downgrade sempre automático. Assimetria proposital: fácil perder autonomia, deliberado ganhar.

---

## 7. Fases

- **F0 — Instrumentação (já existe):** `agent_suggestions` + analytics de aprovação rodando em produção. Nada a fazer além de validar volume de dados por conta.
- **F1 — Ledger + undo + 1 classe (qualify_card) em L1 manual:** sem gates automáticos ainda; o admin liga L1 na mão pra `qualify_card` (a classe de menor risco e maior dor). Valida o loop executa→reporta→undo com contas reais.
- **F2 — Trust Ladder automática:** gates calculados, oferta de upgrade com números, rebaixamento automático, página de confiança.
- **F3 — Novas classes:** `route`, `stage_sync`, `followup_task`, `triage`, `tagging`, nessa ordem (risco crescente de contexto).
- **F4 (pesquisa, sem compromisso):** fila noturna com resumo matinal ("o que a EVA deixou pronto pra sua aprovação enquanto você dormia") — aproxima o valor de autonomia externa sem cruzar a linha.

Gate de negócio honesto: **F2+ só com contas reais usando F1** — a Ladder sem dados de cliente é teatro. Hoje (sem cliente pagante ativo) F1 pode ser validada no ambiente demo + primeiras contas trial.

---

## 8. ICP: expandir o mecanismo, não trocar o alvo

A dor que a Operadora resolve ("operação comercial de conversa bagunçada, CRM que mente, follow-up por memória") é horizontal: clínicas/estética, imobiliárias, energia solar, infoprodutos — os adjacentes já mapeados no ICP de vendas. A spec desenha as classes de ação **agnósticas de vertical** (o playbook da conta define critérios), então a expansão é de copy/landing, não de engenharia.

**Recomendação:** agências continuam beachhead (memória de posicionamento, conteúdo e Ads já apontam pra lá; não há cliente pagante que justifique pivô). A Operadora é o produto que VIAJA entre verticais quando a expansão fizer sentido — "mudar o ICP" vira decisão de marketing com produto pronto, não aposta.

---

## 9. Métricas de sucesso e riscos

**Métricas:**
- % de contas com ≥1 classe em L1+ após 8 semanas de uso.
- Undo rate global (< 2% = a EVA merece a confiança; é O número do produto).
- Tempo economizado estimado por semana por conta (nº de ações autônomas × custo manual médio) — vira copy ("a EVA fez 214 tarefas da sua operação este mês").
- Retenção comparada: contas com Ladder ativa vs só-sugestão.

**Riscos e mitigação:**
- *Erro silencioso em L2* → rebaixamento automático agressivo + digest sempre visível + undo 72h.
- *Confiança inflada por baixo volume* → n mínimo por janela (30); sem volume, não há oferta de upgrade.
- *Percepção de "virou robô"* → linguagem: nunca "autônomo"; sempre "a EVA cuida da arrumação"; a página de confiança mostra o humano no comando da escada.
- *Complexidade de undo em ações encadeadas* → v1 limita: ação autônoma não pode depender de outra ação autônoma da mesma conversa no mesmo ciclo (fila serializa por conversa).

---

---

# PARTE 2 — Atração: como essa tese vira clientes

> Premissas honestas que regem tudo abaixo: founder solo vendendo (Markus é o gargalo), mídia paga pequena (Search ativa a ~R$30/dia), **zero case pagante hoje**. Logo o objetivo desta fase NÃO é escala: é **3 a 5 clientes fundadores em 90 dias**, extraindo o máximo de cada hora do founder. Tudo que não serve a isso, corta.

## 11. Posicionamento: vender CONTRA a categoria

O mercado nos deu um presente: os "robôs de vendas" queimaram a confiança do comprador. A nossa comunicação não disputa a categoria deles; ela se define contra:

**Inimigo declarado nº 1:** a bagunça (planilha, grupo do time, follow-up por memória, CRM que mente).
**Inimigo declarado nº 2:** o robô que fala com o SEU cliente no SEU nome.

Hierarquia de mensagem (do mais visceral ao mais racional):

1. **Dor:** "Você não perde venda por falta de lead. Perde por falta de resposta na hora certa."
2. **Vilão:** "Automatizar a conversa queima sua marca. Automatizar a bagunça, não."
3. **Mecanismo:** "A EVA lê cada atendimento, arruma a operação sozinha e te entrega a decisão pronta. Falar com o lead continua com você."
4. **Prova de honestidade (o gancho da Operadora):** "A EVA não nasce com autonomia. Ela conquista, provando taxa de acerto que você acompanha."

Essa 4ª linha é o que ninguém no mercado pode dizer. A página de confiança (seção 5) não é só UI: é o **argumento central de venda** e deve aparecer em anúncio, demo e landing.

Regras de linguagem já vigentes que se aplicam: sem "agente autônomo", sem "IA que vende sozinha", sem prometer resultado, sem parecer ferramenta enterprise. Tom: "resolve minha bagunça comercial sem eu perder o controle".

## 12. Canais, em ordem de alavanca (para um founder solo)

### 12.1 Hunt cirúrgico com demo personalizada (o canal nº 1 até o 5º cliente)

Nossa arma que nenhum concorrente tem: a demo interativa que **lê o site da agência e personaliza o tour** + o ambiente demo clonável (`create-personalized-demo`). O motion:

1. Lista de 50 agências-alvo (tráfego pago/social, 3 a 30 pessoas, presença ativa no Instagram — sinal de que vendem por conversa).
2. Abordagem 1-a-1 do próprio Markus (não SDR, não massa): mensagem curta com o link `vyzon.com.br/?demo=1` OU um vídeo de 60s da demo já rodando com o site DELES na tela ("gravei a EVA lendo o contexto da sua agência").
3. Quem responde → demo ao vivo de 20min conduzida pelo Markus dentro do ambiente personalizado → oferta fundadora.
- Meta operacional: 10 abordagens/semana, feitas à mão. Volume baixo de propósito: coerência com a tese ("nós não fazemos spam nem para nós mesmos" vira frase de venda).

### 12.2 Oferta fundadora (resolve o problema do "sem case")

Para os 5 primeiros: preço travado do Plus com desconto vitalício + onboarding feito pelo founder + canal direto, **em troca de**: depoimento com nome/logo, 1 case com números reais, e 30min de feedback quinzenal. O custo é margem; o retorno é a prova social que destrava todos os outros canais. Sem case, todo anúncio é promessa; com case, é evidência.

### 12.3 Prova em vídeo (o conteúdo que escala o founder)

O produto é visual e o diferencial é DEMONSTRÁVEL. Prioridade de produção (infra pronta: product films, Inbox Priority List em produção pra captura real):

- **"A EVA lendo de verdade" (30 a 45s):** screen-capture real do Inbox: conversa chegando, leitura da EVA aparecendo, sugestão pronta, humano aprovando. Sem narração épica; o silêncio da operação funcionando É o pitch.
- **"O Diário da EVA" (15 a 30s):** o digest matinal na tela ("ontem: 14 leads qualificados, 11 follow-ups agendados, precisei de você em 2"). É o anúncio da Operadora quando F1 existir; até lá, versão com dados do ambiente demo claramente rotulada como demonstração.
- **Anti-ad (o posicionamento em 20s):** "Todo mundo te vende um robô que fala com seu cliente. A gente faz o contrário." Corte seco pro robô genérico falhando (texto de IA clichê) vs a EVA sugerindo e o humano aprovando.

Distribuição: Instagram/TikTok orgânico + os mesmos cortes como criativo pago quando houver case.

### 12.4 Mídia paga: só intenção de DOR, não categoria

Com R$30/dia, cada clique importa. Search continua o canal (já ativo), mas o critério de keyword muda de categoria ("CRM para agência") para dor e cenário:

- "como não perder lead no whatsapp", "follow up whatsapp agência", "organizar atendimento whatsapp equipe", "lead demora responder esfria".
- Negativar: "grátis", "chatbot", "robô whatsapp" (atrai quem quer o produto que decidimos não ser).
- Anúncio aponta pra `?demo=1` (a demo é nossa melhor landing) com `demo_request` seguindo como conversão primária.
- PMax continua pausada até existir case + criativo de vídeo validado organicamente.

### 12.5 Fundo perene (já rodando, manter)

SEO/GEO (blog, llms.txt, FAQPage) e o chat da EVA na landing são o fundo do funil que trabalha sozinho. Nenhuma ação nova além de: publicar o conteúdo do blog já pronto e, quando F1 nascer, um post pilar "por que a EVA não responde seu cliente sozinha" (a tese da Parte 1 em versão pública, com os dados de mercado citados).

## 13. O que deliberadamente NÃO fazemos

- Outbound em massa (mesmo tendo backend de prospecção pronto e inerte): contradiz a tese pública e o produto.
- Comprar lista / scraping: proibido no produto, proibido no marketing.
- Anúncio de categoria ("o melhor CRM com IA"): briga cara contra RD/HubSpot, e nivela por baixo.
- Prometer resultado ("aumente X% suas vendas"): claims policy; a promessa é sempre mecanismo + controle.

## 14. Métricas da Parte 2

- **Norte:** demos agendadas/semana (booking real do fluxo novo grava tudo em `demo_requests`).
- Funil: abordagem → demo interativa iniciada (`demo_started`, agora persistido) → demo ao vivo → trial → fundador pagante.
- Por canal: taxa de resposta do hunt (meta ≥20% com vídeo personalizado), CTR/CPL da Search de dor, retenção dos vídeos (Clarity + GA4 já instrumentados).
- Kill-switch honesto: canal que após 4 semanas não gera nem 1 demo ao vivo sai do plano; o tempo do founder é o recurso escasso.

## 15. Uma frase pra decidir (agora com a Parte 2)

O mercado inteiro tentou substituir o vendedor e quebrou a confiança; nós vamos substituir a **planilha das 2h da manhã**, provar isso na tela em 60 segundos, e cobrar pela confiança que os outros perderam.
