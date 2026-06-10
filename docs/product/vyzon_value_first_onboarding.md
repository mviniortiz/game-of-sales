# VYZON.AGENTS.3 — Valor em 5 minutos, configuração depois

> **Status:** design (pré-implementação).
> **Data:** 2026-06-02.
> **Base:** [vyzon_agents_for_agencies.md](./vyzon_agents_for_agencies.md), [vyzon_qualifier_agent_spec.md](./vyzon_qualifier_agent_spec.md).
> **Decisão que este doc resolve:** o valor vem **antes** da configuração, não depois. Inverte a ordem que a spec do Qualificador assumia (blueprint aprovado → uso).

---

## 0. O problema que estamos corrigindo

A spec AGENTS.2 tem um gate: o Qualificador só sugere ao vivo quando o blueprint está `approved_assisted`. Isso significa: **configura → simula → aprova → só então vê valor.**

Pro dono de agência afogado, essa ordem mata a venda. Ele não quer configurar uma IA. Ele quer ver, em 5 minutos, um lead que ia perder sendo pego.

**A inversão:** valor primeiro (com um padrão de agência pronto), configuração como refinamento opcional depois.

A trava de segurança continua intacta — mas ela muda de lugar (seção 5).

---

## 1. Reenquadramento: segurança ≠ aprovação de blueprint

A spec antiga juntava duas coisas que são diferentes:

| Tipo de "aprovação" | O que protege | Quando acontece |
|---|---|---|
| **Aprovação por sugestão** (1 toque) | Nada é gravado/enviado sem o humano | Toda hora, no fluxo. **É a trava real.** |
| **Aprovação do blueprint** (`approved_assisted`) | "Esse agente está afinado pro meu negócio" | Marco de refinamento. **NÃO precisa ser pré-requisito de valor.** |

Insight central: **a aprovação por sugestão já garante a segurança.** Como nada é aplicado sem um toque humano, é seguro mostrar sugestões desde o minuto 1 — mesmo sem o blueprint formalmente aprovado. O blueprint aprovado deixa de ser um portão e vira um selo de "agora é do seu jeito".

Resultado: dá pra entregar valor no dia 1 **sem abrir mão** de "nada sai sem você ver".

---

## 2. O fluxo de primeiro valor (5 minutos)

```
1. Conecta o WhatsApp (QR) ──► 2. EVA lê as conversas recentes ──► 3. Mostra "quem vale a pena"
   (evolution-whatsapp,           (já existe: Inbox/polling)         (Qualificador com PADRÃO
    WhatsAppConnectModal)                                              de agência, sem config)
                                                                              │
4. Você dá o ok no primeiro lead ◄──────────────────────────────────────────┘
   (1 toque: confirma tag/campo, copia a pergunta sugerida)
   → "Pronto. Era isso. Agora ela faz isso com todo lead novo."
```

- **Sem etapa de configuração obrigatória.** O onboarding atual (`/onboarding`) ganha um passo "conectar WhatsApp" e termina já no Inbox com leads diagnosticados.
- **O primeiro "aha" é um lead real qualificado**, não uma tela de setup.
- Se o WhatsApp não conectar na hora, cai no **modo demo** (conversas da "Agência Metria Growth") para ainda ver o valor — marcado como exemplo.

---

## 3. O "Pacote Agência" — padrão que funciona sem configurar

Para o valor existir sem config, a EVA precisa vir **pré-carregada** com um blueprint de agência sensato. Isso é dado de seed, não configuração do usuário.

- **Blueprint padrão** (`agent_key='qualifier'`, status especial — ver seção 6): agente "Qualificador", segmento "Agência", campos (serviço, orçamento, decisor, prazo, origem), tags (`lead-quente/morno/frio`, `fora-do-icp`, `precisa-followup`, `indicacao`), regras de tom e linhas vermelhas, perguntas de qualificação.
- **Cenários de agência** já embutidos (os 7 da spec AGENTS.2 §8).
- O usuário **não vê nada disso** no começo. Ele vê leads sendo qualificados. O blueprint existe por baixo.

"Configurar" passa a ser: *"quer ajustar o jeito que a EVA qualifica? aqui"* — opcional, depois do valor.

---

## 4. A superfície simples: a tela "Hoje"

O produto que vende é **uma tela**, não um CRM inteiro. Proposta: um foco diário dentro do Inbox (ou topo dele):

> **Hoje**
> - 3 leads precisam de você (quentes / parados)
> - 2 follow-ups que você ia esquecer
> - 1 lead novo qualificado: *[nome] — serviço: tráfego, orçamento ~5k, decisor sim* → **[Confirmar] [Ajustar]**

Tudo que não é "o que fazer agora" fica **embaixo**: pipeline, metas, ranking, memória, regras, Agent Studio. Existem, são a profundidade (retenção), mas não competem com o loop diário.

Princípio de UI: **a tela inicial responde "o que eu faço agora?", em 1 toque por item.**

---

## 5. Aprovação de 1 toque (controle sem fricção)

O "assistido" só alivia se aprovar for quase nada. Mecânica:

- **Caminho feliz = 1 toque.** Sugestão óbvia (tag clara, campo detectado com alta confiança) → botão **Confirmar** grava e fecha. Sem ler-e-decidir.
- **Ajustar** abre edição só quando o humano quer mudar.
- **Lote leve:** "Confirmar os 3 óbvios" quando há vários de alta confiança — ainda é uma ação humana, mas não 3 toques.
- **Envio continua sempre manual:** perguntas/follow-ups são "Copiar pro WhatsApp" (nunca enviar sozinho). Esse é o limite que não se move.
- **Confiança modula a fricção:** alta confiança → 1 toque; baixa confiança → pede revisão explícita. A EVA nunca empurra o que ela mesma não tem certeza.

A sensação alvo: *"eu só fico dando ok nas coisas certas, e o que é dúvida ela me mostra."*

---

## 6. O que muda no estado do agente (vs AGENTS.2)

Acrescenta-se **um estado inicial** que destrava valor sem config:

```
seeded → (refino opcional) → in_review → ready_to_test → approved_assisted
   │
   └─► já sugere ao vivo (em modo "padrão"), com aprovação por sugestão
```

- **`seeded`** (novo): blueprint padrão de agência, ativo, **sugere desde já**. Badge na UI: *"Padrão de agência — ajuste quando quiser."*
- O gate da spec antiga (só sugere se `approved_assisted`) **muda para:** sugere se status ∈ {`seeded`, `ready_to_test`, `partially_applied`, `approved_assisted`}. Ou seja, sugere desde o seed.
- `approved_assisted` deixa de ser portão de valor e vira **selo de "afinado por mim"** — remove o badge "padrão", e é o que a gente exige antes de soltar agentes mais sensíveis (follow-up com cadência, proposta).
- A segurança não cai: **a aprovação por sugestão (seção 5) está sempre ligada**, independente do estado do blueprint.

Schema: é só um valor a mais no enum de status de `eva_blueprints` (aditivo, sem quebrar nada).

---

## 7. Profundidade progressiva (o "completo" aparece quando faz sentido)

Nada some — só deixa de competir com o primeiro valor. Revelação por gatilho:

| Quando | O que aparece |
|---|---|
| Dia 1 | Leads qualificados no Inbox + tela "Hoje" |
| Depois de aprovar uns leads | "Quer que ela lembre seus follow-ups?" → ativa Follow-up |
| Quando tem volume | Pipeline e metas começam a fazer sentido (dado real) |
| Quando quer afinar | "Ajustar como a EVA qualifica" → entra no Studio (config) |
| Quando quer confiar mais | Simulações + aprovação formal (`approved_assisted`) |
| Time crescendo | Ranking, performance, Agente Gestor |

"Completo" é uma **escada de retenção**, não um formulário de entrada.

---

## 8. O que isso muda na spec AGENTS.2

| AGENTS.2 dizia | AGENTS.3 ajusta |
|---|---|
| Bloco do Qualificador só ao vivo se `approved_assisted` | Ao vivo já em `seeded`; segurança é a aprovação por sugestão |
| Blueprint começa em `draft`/`in_review` | Empresas de agência nascem com blueprint **`seeded`** (Pacote Agência) |
| Onboarding implícito = configurar primeiro | Onboarding = conectar WhatsApp → ver lead qualificado; config é opcional |
| Aprovação formal = liberar uso | Aprovação formal = "afinei pro meu negócio" + libera agentes sensíveis |
| (nada sobre primeiro valor) | Métrica de ativação: tempo até 1º lead qualificado confirmado |

O resto da AGENTS.2 (contratos `QualifierInput`/`QualifierSuggestion`, `agent_key`, tabela `agent_suggestions`, gerador determinístico, log aceito/ajustado/rejeitado) continua **igual**. Só inverteu a ordem e adicionou o estado `seeded`.

---

## 9. Trust & safety (continua intacto)

- **Não envia mensagem sozinho** — "Copiar pro WhatsApp" é o limite.
- **Nada gravado sem 1 toque** — a aprovação por sugestão é a trava, sempre ligada (mesmo no `seeded`).
- **Padrão é transparente** — badge "Padrão de agência" deixa claro que ainda não foi afinado; nada finge ser personalizado.
- **Sem dado externo** — só conversas/CRM internos; sem scraping.
- **Sem promessa de resultado** — copy de bagunça+controle, não de "venda mais com IA".
- **Permissões/RLS** por empresa, config admin-only (igual AGENTS.2).

A inversão **não relaxa segurança** — ela move a segurança do portão (blueprint) pro ponto onde ela importa (cada gravação).

---

## 10. Métrica que define sucesso

A métrica-âncora do MVP deixa de ser "% aprovou o agente" e vira **ativação real**:

- **TTFQL — Tempo até o 1º lead qualificado confirmado** (conectou WhatsApp → deu ok no 1º lead). Alvo: < 10 min.
- **Leads recuperados na 1ª semana** (parados que viraram conversa via sugestão).
- **% de sugestões confirmadas em 1 toque** (mede se o caminho feliz é mesmo sem fricção).

Se o cara conecta e em 10 minutos confirma um lead que ia perder, ele compra. Essa é a aposta inteira.

---

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Padrão de agência genérico demais → sugestão ruim no dia 1 | Pacote Agência bem curado + confiança modula fricção (não empurra dúvida) |
| Aprovação por sugestão ainda cansa | 1 toque + lote leve + só pede revisão no que é incerto |
| WhatsApp não conecta → onboarding morre | Fallback demo (Agência Metria Growth) mostra o valor mesmo sem conectar |
| "Completo" vaza pra cima e re-complica a tela | Tela "Hoje" como superfície única; profundidade só por gatilho |
| Soar enterprise/IA de novo | Copy bagunça+controle (ver [feedback de posicionamento BR]); "agentes" é termo interno |

---

## 12. Plano em fases pequenas

| Fase | Entrega | Observação |
|---|---|---|
| **3.1** | Estado `seeded` no enum + Pacote Agência (seed do blueprint padrão por empresa nova) | Aditivo; aplicar via `db query --linked -f` |
| **3.2** | Gate de exibição = sugere em `seeded` (não exige `approved_assisted`) | Pequeno ajuste de condição |
| **3.3** | Passo "conectar WhatsApp" no onboarding → termina no Inbox com leads diagnosticados | Reusa `evolution-whatsapp` + EvaPanel |
| **3.4** | Aprovação de 1 toque + "Confirmar os óbvios" no EvaPanel | Sobre o bloco do Qualificador (AGENTS.2 §10) |
| **3.5** | Tela/seção "Hoje" (foco diário) | Superfície simples |
| **3.6** | Revelação progressiva (gatilhos pra Follow-up, Studio, etc.) | Retenção |
| **3.7** | Fallback demo no onboarding + instrumentar TTFQL | Ativação |

Cada fase fecha com `tsc` + `vite build` verdes. Nada em produção sem OK.

---

## Resumo

A venda depende de inverter a ordem: **conecta → vê um lead qualificado → dá o ok**, com um Pacote Agência pronto por baixo, e a configuração (Studio, simulação, aprovação formal) virando refinamento opcional. A segurança não cai porque ela nunca dependeu do blueprint aprovado — depende da aprovação por sugestão, que fica sempre ligada. "Simples" é a tela "Hoje" na frente; "completo" é a escada de profundidade atrás, revelada quando o cliente já tirou valor. É isso que transforma um "CRM de IA enterprise" em *"resolve minha bagunça sem eu perder o controle"*.
