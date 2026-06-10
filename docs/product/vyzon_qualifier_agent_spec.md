# VYZON.AGENTS.2 — Especificação técnica do Agente Qualificador para Agências

> **Status:** especificação técnica (pré-implementação). Não codar tudo ainda.
> **Data:** 2026-06-02.
> **Base:** [vyzon_agents_for_agencies.md](./vyzon_agents_for_agencies.md) (VYZON.AGENTS.1).
> **Princípio:** assistido, não autônomo. A IA sugere, o humano aprova antes de gravar/enviar/alterar qualquer coisa.

Toda referência a SQL é **design**; quando for aplicar, usar `npx supabase db query --linked -f <file>` (nunca `db push`), com `GRANT` antes de habilitar RLS, no padrão das migrations `eva_*` existentes.

---

## 0. O que já existe (e vamos reusar)

| Peça | Arquivo/tabela | Reuso no Qualificador |
|---|---|---|
| Blueprint persistente (singleton por empresa) | `eva_blueprints`, `useEvaBlueprint` | Config do agente (agente, segmento, objetivo, campos, tags, regras, lacunas, status) |
| Estados de aprovação | status `draft→in_review→ready_to_test→partially_applied→approved_assisted` | Ciclo de vida da **configuração** do agente |
| Simulações persistidas | `eva_simulation_results`, `src/lib/eva/scenarios.ts`, `useEvaSimulationResults` | Teste do agente antes do uso assistido |
| Critérios de aprovação | `src/lib/eva/approval.ts` (`computeApproval`) | Score + travas (handoff, crítico reprovado, mínimo de testes) |
| Regras aplicadas → sugestões | `eva_business_context.playbooks` (`source=eva_studio`), `useEvaStudioRules`, `EvaStudioRules.tsx` | Orienta o tom/limites das sugestões |
| Painel no Inbox | `src/components/inbox/EvaPanel.tsx` | Onde o diagnóstico do Qualificador aparece |
| Painel no Deal | `src/pages/DealCommandCenter.tsx` | Resumo de qualificação no deal |
| Log de sugestão (precedente) | `eva_deal_suggestions` (pending/accepted/edited/skipped/expired) | Modelo de ciclo de vida para o novo log generalizado |

**Decisão central:** o Agente Qualificador **é o EVA Studio de hoje** com `agent_key='qualifier'`. Nada do motor é reescrito.

---

## 1. Arquitetura técnica do Agente Qualificador

Três camadas, com uma costura clara para evolução futura:

```
[Fontes]                [Gerador de sugestão]            [Aprovação humana]         [Operação]
conversa do canal  ─┐
contexto da empresa ├─►  qualifierGenerate(input)  ─►  QualifierSuggestion  ─►  humano revisa  ─►  grava campo/tag
regras aplicadas    │      (determinístico no MVP;      (proposta, nada            no EvaPanel/Deal     no deal/conversa
tags/campos/blueprint┘      edge function depois)         aplicado)                                    + log de auditoria
```

- **MVP = gerador determinístico/heurístico** (mesma filosofia de `scenarios.ts`): classifica intenção, detecta campos a partir de regex/keywords, monta perguntas a partir do blueprint. **Sem IA real ainda** — o contrato já é desenhado para que um edge function (Claude) substitua o gerador sem mudar consumidores.
- **Sem efeito colateral na geração:** `qualifierGenerate` é uma função pura `input → QualifierSuggestion`. Não escreve nada.
- **Toda escrita passa pelo humano:** aceitar uma sugestão chama os caminhos de escrita já existentes (update do deal, `tag_assignments`), e registra no log.

Hook proposto: `src/hooks/useQualifierSuggestion.ts` — recebe `QualifierInput`, retorna `{ suggestion, loading, regenerate }`. No MVP chama o gerador local; depois pode chamar um edge function.

---

## 2. Contrato de dados de entrada — `QualifierInput`

```ts
// src/lib/agents/qualifier/types.ts (design)
export interface QualifierInput {
  companyId: string;
  agentKey: "qualifier";
  source: "whatsapp" | "instagram" | "form" | "indicacao" | "trafego" | "other";
  conversation: {
    conversationId?: string;   // channel_conversations.id (Inbox), se houver
    dealId?: string;           // deals.id (Deal), se houver
    messages: { role: "lead" | "agent" | "internal"; text: string; at?: string }[];
  };
  context: {
    segment?: string;          // do blueprint (nicho da agência)
    knownFields: Record<string, string>;  // campos já preenchidos no deal
    existingTags: string[];    // tags já aplicadas
    blueprintFields: string[]; // campos que o agente busca (eva_blueprints.detected_fields)
    blueprintTags: string[];   // tags candidatas (suggested_tags)
    rules: string[];           // regras aplicadas (source=eva_studio) — tom/limites/linhas vermelhas
  };
}
```

Regras do input: só dados **internos** (conversa, notas, CRM). Proibido enriquecer via Google/LinkedIn ou qualquer fonte externa.

---

## 3. Contrato de saída da sugestão — `QualifierSuggestion`

```ts
export type QualifyScore = "green" | "yellow" | "red";

export interface DetectedField {
  key: string;            // ex: "orcamento"
  label: string;          // "Orçamento"
  value: string;          // valor detectado na conversa
  confidence: number;     // 0..1 (heurística no MVP)
  source: "conversation"; // SEMPRE conversation no MVP (nunca externo)
  needsConfirmation: true;// sempre true: humano confirma antes de gravar
}

export interface QualifierSuggestion {
  agentKey: "qualifier";
  score: QualifyScore;            // green=qualificado, yellow=falta 1-2, red=fora/sem critério
  scoreReasons: string[];         // por que esse score (transparência)
  detectedFields: DetectedField[];
  missingFields: string[];        // campos do blueprint ainda não detectados
  suggestedTags: { name: string; reason: string }[];
  recommendedQuestions: string[]; // perguntas para o vendedor fazer
  nextAction: string;             // ex: "Coletar orçamento" | "Handoff humano (lead quente)"
  handoff: { required: boolean; reason?: string };
  rationale: string;              // resumo em 1 linha do diagnóstico
  isPreview: true;                // marca de prévia/sugestão (nunca ação aplicada)
}
```

Garantias do contrato: tudo é **proposta**. `needsConfirmation` e `isPreview` são imutáveis (`true`) no MVP — refletem que nada foi aplicado.

---

## 4. Schema aditivo necessário

Tudo **aditivo** e backward-compatible. Aplicado depois, não agora.

### 4.1 `agent_key` em `eva_blueprints` (Fase A — não mexe na unicidade)
```sql
-- design — aplicar via db query --linked -f
alter table public.eva_blueprints
  add column if not exists agent_key text not null default 'qualifier';
-- mantém unique(company_id) por enquanto: ainda 1 agente por empresa no MVP.
comment on column public.eva_blueprints.agent_key is
  'VYZON.AGENTS.2: chave do agente. MVP=qualifier. Multi-agente troca o unique em fase futura.';
```
A linha existente de cada empresa é backfillada para `'qualifier'` pelo default — **o EVA Studio atual continua funcionando sem alteração**.

### 4.2 `agent_key` em `eva_simulation_results` (Fase A)
```sql
alter table public.eva_simulation_results
  add column if not exists agent_key text not null default 'qualifier';
-- unique(company_id, scenario_id) preservado; cenários do qualifier são namespaced (q_*).
```

### 4.3 Log de sugestões — nova tabela `agent_suggestions`
Generaliza o precedente `eva_deal_suggestions` (que é específico de follow-up por deal). Cobre Inbox e Deal, aceito/ajustado/rejeitado, com payload do que foi de fato aplicado (para auditoria e aprendizado futuro).

```sql
-- design
create table if not exists public.agent_suggestions (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null references public.companies(id) on delete cascade,
  agent_key       text not null default 'qualifier',
  conversation_id uuid references public.channel_conversations(id) on delete set null,
  deal_id         uuid references public.deals(id) on delete set null,
  input_summary   jsonb not null default '{}'::jsonb,   -- resumo do que entrou (sem PII desnecessária)
  suggestion      jsonb not null default '{}'::jsonb,   -- QualifierSuggestion serializada
  status          text not null default 'pending'
                    check (status in ('pending','accepted','adjusted','rejected','expired')),
  applied_payload jsonb,                                 -- o que o humano realmente gravou (após edição)
  feedback        text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  resolved_by     uuid references auth.users(id) on delete set null,
  resolved_at     timestamptz
);
create index if not exists idx_agent_suggestions_company on public.agent_suggestions(company_id);
create index if not exists idx_agent_suggestions_conv on public.agent_suggestions(conversation_id);
create index if not exists idx_agent_suggestions_deal on public.agent_suggestions(deal_id);

grant select, insert, update, delete on public.agent_suggestions to authenticated;
grant all on public.agent_suggestions to service_role;
alter table public.agent_suggestions enable row level security;

create policy "agent_suggestions_select" on public.agent_suggestions for select
  using ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_suggestions_insert" on public.agent_suggestions for insert
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_suggestions_update" on public.agent_suggestions for update
  using ( public.is_super_admin() or company_id = public.get_my_company_id() )
  with check ( public.is_super_admin() or company_id = public.get_my_company_id() );
create policy "agent_suggestions_delete" on public.agent_suggestions for delete
  using ( public.is_super_admin() );
```
Nota de RLS: aqui SELECT/INSERT/UPDATE são por **membro da empresa** (qualquer vendedor registra o desfecho da sugestão que ele revisou); a *configuração* do agente continua admin-only (em `eva_blueprints`). DELETE só super_admin.

### 4.4 Fase B (NÃO agora — quando entrar o 2º agente)
```sql
-- trocar unicidade para multi-agente:
alter table public.eva_blueprints drop constraint eva_blueprints_company_id_key;
alter table public.eva_blueprints add constraint eva_blueprints_company_agent_key unique (company_id, agent_key);
-- idem simulação: unique(company_id, agent_key, scenario_id)
```

---

## 5. Como usar `agent_key` sem quebrar o EVA Studio atual

1. **Coluna com default `'qualifier'`** → toda linha existente vira a do Qualificador automaticamente.
2. **Unicidade intacta no MVP** (`unique(company_id)`): continua 1 blueprint por empresa, exatamente como hoje.
3. **Hooks ganham parâmetro opcional** `agentKey` com default `'qualifier'`:
   ```ts
   useEvaBlueprint({ agentKey = "qualifier" } = {})  // query: .eq('agent_key', agentKey) defensivo
   useEvaSimulationResults({ agentKey = "qualifier" } = {})
   ```
   Como só existe a linha `'qualifier'`, o comportamento é idêntico ao atual até existir um 2º agente.
4. **Nenhuma mudança de UI obrigatória** para o motor funcionar — o seletor de agente (seção 9) é cosmético no MVP (1 item).

Resultado: o fluxo atual do EVA Studio é preservado bit a bit; `agent_key` é uma dimensão dormente até a Fase B.

---

## 6. Registrar sugestões aceitas, ajustadas e rejeitadas

Ciclo de vida em `agent_suggestions.status`:

| Ação do humano | status | applied_payload | Efeito na operação |
|---|---|---|---|
| Recebe diagnóstico | `pending` | — | nenhum (só exibido) |
| Aceita como está | `accepted` | snapshot do que foi gravado | grava campo/tag **após confirmar** |
| Ajusta e aplica | `adjusted` | versão editada pelo humano | grava a versão editada |
| Rejeita/descarta | `rejected` | — | nada gravado (feedback opcional) |
| Sem ação até expirar | `expired` | — | nada |

Princípios:
- **Aceitar nunca é silencioso:** abre confirmação (mesma filosofia da aplicação granular do blueprint).
- **Escrita reusa caminhos existentes:** campos → update do `deals`; tags → `tag_assignments`. O log apenas registra o desfecho (auditoria + base de aprendizado futuro).
- **Ajustado guarda o diff implícito** (suggestion original vs applied_payload) → sinal de qualidade do agente.
- **Rejeitado com feedback** alimenta os Insights ("o que melhorar").

Hook proposto: `useAgentSuggestionLog` com `record(status, { appliedPayload?, feedback? })`.

---

## 7. Estados do agente

Dois eixos distintos (não confundir):

**A) Estado da configuração do agente** (em `eva_blueprints.status`, por `agent_key`) — já existe:
`draft → in_review → ready_to_test → partially_applied → approved_assisted`
Só em `approved_assisted` o agente passa a **exibir sugestões ao vivo** no Inbox/Deal.

**B) Estado de cada sugestão em runtime** (em `agent_suggestions.status`):
`pending → accepted | adjusted | rejected | expired`

Gate de ativação: o `EvaPanel`/Deal só renderizam o bloco do Qualificador ao vivo quando o blueprint do `qualifier` está `approved_assisted`. Antes disso, as sugestões só aparecem em **simulação** (aba Simulações), nunca na operação real.

---

## 8. Simulações obrigatórias para agência

Adaptar `src/lib/eva/scenarios.ts` (hoje com tema imobiliário) para contexto de agência. Mínimo de 7 cenários, 2 críticos. Cada um mapeia para um `QualifierSuggestion` esperado.

| key | label | crítico | score esperado | testa |
|---|---|---|---|---|
| `q_icp_completo` | Lead ICP com orçamento e prazo | não | green | detecção completa + nextAction avançar |
| `q_sem_orcamento` | Lead interessado, sem orçamento | não | yellow | missingFields = orçamento + pergunta recomendada |
| `q_fora_icp` | Lead fora do ICP (ex: pessoa física curiosa) | **sim** | red | não marcar como quente; handoff/descarte educado |
| `q_preco_de_cara` | "Quanto custa?" logo no início | **sim** | yellow | objeção preço → handoff humano, sem prometer/descontar |
| `q_indicacao` | Lead por indicação | não | green/yellow | tag `indicacao` + tom de prioridade |
| `q_urgente` | "Preciso começar essa semana" | não | green | urgência alta + nextAction handoff p/ closer |
| `q_curioso` | Quer "saber mais" sem intenção | não | yellow/red | não inflar score; pergunta de qualificação |

Critérios de liberação (via `computeApproval` já existente): ≥5 cenários testados, **nenhum crítico reprovado** (`q_fora_icp`, `q_preco_de_cara`), handoff definido nas regras, score de validação ≥80%.

Estrutura de cada cenário segue o `Scenario` atual (`key,label,critical?,leadMessage,reply,identifies,fields,tags,intent,urgency,nextAction`) — sem mudança de tipo, só conteúdo de agência.

---

## 9. Ajustes no EVA Studio para virar Agent Studio (com 1 agente)

Mínimo viável, **sem refator do motor**:

1. **Seletor de agente** no topo da aba Studio: um dropdown/segmented com "Agente Qualificador" ativo e os demais (Follow-up, Objeções, Proposta, Gestor) como **"em breve"** (desabilitados). Estado local `agentKey` (default `'qualifier'`).
2. **Threading do `agentKey`** para `useEvaBlueprint`/`useEvaSimulationResults` (default já é qualifier → comportamento idêntico).
3. **Copy:** "EVA Studio" pode manter o nome; o subtítulo e o card "Estado da EVA" passam a nomear "Agente Qualificador". A EVA continua a camada-mãe (não criar marca nova).
4. **Cenários de agência** carregados em `scenarios.ts` (seção 8).
5. Abas Memória/Insights inalteradas no MVP (são base comum). Simulações filtra por `agentKey` (só há qualifier).

Nada disso quebra o fluxo atual: com 1 agente, é o EVA Studio de hoje com um rótulo de agente.

---

## 10. Ajustes no Inbox / `EvaPanel`

Adicionar um bloco **"Diagnóstico do Qualificador"** (só quando `qualifier` está `approved_assisted`):

- **Badge de score**: verde/amarelo/vermelho + `rationale` em 1 linha.
- **Campos detectados**: lista com valor + `confidence`; cada um com botão **"Confirmar"** (grava no deal após confirmação) e "Ignorar".
- **Campos faltando**: chips discretos (`missingFields`).
- **Tags sugeridas**: chips com "Aplicar" (confirma antes de criar/associar via `tag_assignments`).
- **Perguntas recomendadas**: lista com "Copiar" (joga no compositor; **não envia**).
- **Próxima ação** + **banner de handoff** quando `handoff.required`.
- **Ações do bloco**: `Aceitar tudo` / `Ajustar` / `Descartar` → registram em `agent_suggestions`.
- Reusar o `EvaStudioRules.tsx` já presente (mostra as regras que orientaram a sugestão).

Regra de ouro: nenhum botão envia mensagem; "Copiar" e "Confirmar" são os limites.

---

## 11. Ajustes no `DealCommandCenter`

- Bloco **"Qualificação"** no topo da coluna principal (perto do FocusCard "Próxima ação" já existente):
  - score + `missingFields` como checklist do que falta confirmar;
  - **"Aplicar campos sugeridos"** → confirmação → update do `deals` + log;
  - tags sugeridas com confirmação;
  - `nextAction` e handoff.
- Mantém o `<EvaStudioRules />` já plugado.
- Escrita só com confirmação e respeitando permissão (dono do deal/admin).

---

## 12. Permissões e auditoria

| Quem | Pode |
|---|---|
| **Admin** (`useAuth().isAdmin` → `canEdit`) | Configurar/editar blueprint do agente, aprovar uso assistido, editar regras |
| **Membro/vendedor** | Ver diagnóstico, confirmar/ajustar/rejeitar sugestões nas próprias conversas/deals, gravar campo/tag após confirmação |
| **super_admin** | Bypass (RLS) |

Auditoria:
- Configuração: `eva_blueprints.approved_by/at`, `applied_*` (já existe).
- Runtime: cada sugestão e seu desfecho em `agent_suggestions` (`created_by`, `resolved_by/at`, `status`, `applied_payload`, `feedback`).
- Tudo escopado por `company_id` via RLS (padrão do projeto, GRANT antes de RLS).

---

## 13. Critérios de aceite

1. `agent_key` adicionado às tabelas com default `'qualifier'`, **sem regressão** no EVA Studio atual (blueprint carrega, salva, aplica, aprova como antes).
2. `qualifierGenerate(input)` é pura e determinística; `QualifierInput`/`QualifierSuggestion` tipados e estáveis.
3. Os 7 cenários de agência rodam na aba Simulações; os 2 críticos travam aprovação se reprovados.
4. Bloco do Qualificador aparece no `EvaPanel` **apenas** quando `approved_assisted`.
5. Aceitar/ajustar campo ou tag grava **só após confirmação** e registra em `agent_suggestions`.
6. Rejeitar registra status + feedback, sem gravar nada.
7. Nenhum envio de mensagem, nenhuma escrita automática, nenhum dado externo.
8. Permissões: membro não edita config; escrita respeita dono/admin; RLS por empresa.
9. `tsc --noEmit` e `vite build` passam a cada fase.

---

## 14. Plano de implementação em fases pequenas

| Fase | Entrega | Risco | Depende de |
|---|---|---|---|
| **2.1** | Migration aditiva: `agent_key` em blueprints+simulações; tabela `agent_suggestions` (RLS) | Baixo | aplicar via `db query --linked -f` |
| **2.2** | Threading de `agentKey` nos hooks (default qualifier) + seletor de agente no Studio (1 item) | Baixo | 2.1 |
| **2.3** | `src/lib/agents/qualifier/` (tipos + `qualifierGenerate` determinístico) + cenários de agência em `scenarios.ts` | Médio | tipos |
| **2.4** | `useQualifierSuggestion` + `useAgentSuggestionLog` | Médio | 2.1, 2.3 |
| **2.5** | Bloco do Qualificador no `EvaPanel` (gate `approved_assisted`, confirmação, log) | Médio | 2.4 |
| **2.6** | Bloco de qualificação no `DealCommandCenter` (aplicar campos com confirmação) | Médio | 2.4 |
| **2.7** | Insights por agente + relatório de sugestões (aceito/ajustado/rejeitado) | Baixo | 2.4 |
| **2.8** | Dados demo de agência (conversas de lead) na "Agência Metria Growth" | Baixo | 2.3 |

Cada fase fecha com `tsc` + `vite build` verdes. Nada vai a produção sem OK explícito.

---

## 15. O que explicitamente NÃO será implementado agora

- **IA real** no gerador — MVP é determinístico/heurístico; edge function (Claude) fica para depois, atrás do mesmo contrato.
- **Envio automático** de qualquer mensagem (WhatsApp/Instagram/e-mail).
- **Scraping/prospecção** ou enriquecimento por fonte externa.
- **Outros agentes** (Follow-up, Objeções, Proposta, Gestor) — só Qualificador.
- **Troca da unicidade** `unique(company_id)` → `(company_id, agent_key)` (Fase B, quando entrar o 2º agente).
- **Geração de proposta** ou qualquer escrita sem confirmação humana.
- **Refactor do motor** do EVA Studio.
- **Promessa de resultado comercial** em qualquer copy ou sugestão.

---

## Resumo

O Qualificador reaproveita ~90% do que existe: o blueprint vira a config do agente (`agent_key='qualifier'`), as simulações testam, `computeApproval` libera o uso assistido, e o diagnóstico aparece no Inbox/Deal como **proposta** que o humano confirma. O único schema novo é aditivo (`agent_key` dormente + tabela `agent_suggestions` de auditoria). Tudo backward-compatible, sem automação, sem refactor, com o humano no controle de toda escrita.

**Próximo passo sugerido:** implementar a Fase 2.1 (migration aditiva) seguida da 2.3 (tipos + gerador determinístico + cenários de agência), que são as de menor risco e desbloqueiam o resto.
