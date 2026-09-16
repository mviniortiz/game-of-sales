# CLAUDE.md — Vyzon (game-of-sales)

> **Vyzon é a Central Comercial com EVA para agências BR que vendem por
> conversa.** O lead chega por WhatsApp/Instagram/formulário, a EVA lê cada
> atendimento, aponta quem está pronto e sugere o próximo passo; o time
> aprova e a oportunidade segue no pipeline. Posicionamento canônico em
> produção: `index.html`. (Atualizado 2026-07-28; substitui a versão longa,
> cujo detalhe migrou pra fontes de verdade, docs e skills.)

## Inegociável — autonomia GRADUADA (decisão 2026-08-21; substitui o híbrido de 2026-06-12)

- **Interno: automático.** O loop da EVA (`eva-agent-loop`) executa sozinho
  ações internas: ler contexto, criar/atualizar card, mover estágio, criar
  nota. Catálogo de tools em `agent_tools`; execução auditada em
  `agent_runs`/`agent_steps`.
- **Saída pro lead: sempre aprovação humana** (padrão aprovar-e-enviar,
  `agent_suggestions` status='pending'). Nenhum agente dispara mensagem
  sozinho. Tool `draft_outbound_message` só gera rascunho, nunca envia.
- **A aprovação acontece no WhatsApp do dono** (APPROVAL.1, 2026-08-24), não
  numa fila dentro do app: `_shared/whatsappApproval.ts` manda o rascunho com
  código curto, ele responde 1, 2 ou o texto corrigido, e a
  `evolution-message-webhook` resolve. Motivo: 162 de 175 sugestões estavam
  paradas em 'pending' porque aprovar exigia abrir o app. Rascunho com mais de
  48h expira sozinho e nunca é enviado.
- **Nunca:** scraping/enriquecimento externo, promessa de resultado,
  substituir o vendedor. Slogan segue válido pra saída:
  **"A EVA sugere, seu time aprova."**

## Comandos

```bash
npm run lint
npx tsc -p tsconfig.app.json --noEmit
npm test               # vitest
npm run test:e2e       # playwright
npm run build          # vite build + scripts/prerender-seo.mjs
npx supabase db query --linked -f <arquivo.sql>   # migrations. NUNCA `db push`
```

Deploy: push na `main` → Vercel (projetos vyzon + vyzon-org). GitHub Actions
está BLOQUEADO por billing; não criar workflows.

## Regras duras (violação = retrabalho garantido)

1. **Claims Policy:** nunca afirmar feature, integração, número, resultado ou
   capacidade sem verificar no código. Antes de copy de produto: grep.
2. **Migrations:** aditivas e backward-compatible; **GRANT (authenticated +
   service_role) ANTES de habilitar RLS**; escopo por `company_id`; auditar
   as 4 operações RLS (schemas legados têm policy parcial); helpers
   `is_super_admin()` / `get_my_company_id()` / `has_role()`; trigger
   `update_updated_at()`. `insert().select()` de anon exige policy SELECT →
   preferir RPC SECURITY DEFINER.
3. **Empresa efetiva no front:** `useTenant().activeCompanyId || companyId`,
   nunca só `companyId` (super_admin opera outra empresa).
4. **Copy:** sem travessão, sem emoji; autonomia graduada (interna automática,
   saída pro lead sempre aprovada); proibido "CRM gamificado",
   "automatize suas vendas", "robô que vende sozinho", promessa de automação
   total.
5. **Visual:** sem ícones Sparkles/Zap; sem orbe/partícula/glow de IA
   genérica; EVA é entidade ABSTRATA (EvaCoreVisual/EvaNode), nunca
   avatar/rosto; roxo `#6d28d9` só como micro-acento.
6. **Fonte de verdade > prosa.** Antes de citar em copy, LER:
   - Preços/planos: `src/config/plans.ts` (landing espelha
     `src/data/landing/pricing.ts`; limites hardcoded nas edges
     `admin-create-seller`, `whatsapp-copilot`, `deal-call-initiate`,
     `deal-call-generate-insights` — mudou plano, redeploya as 4).
   - Integrações: `src/config/integrationsConfig.ts` (não confirmada no
     código = "Em breve" / "Sob consulta"; nunca inventar).
   - Contatos/links: `src/config/contact.ts`.
   - Tokens de design: `src/index.css` (`--lp-*` landing, `--vyz-*` app).

## Stack e mapa

- Vite + React 18 + TypeScript + Tailwind + shadcn/ui; React Router v6;
  @tanstack/react-query; react-hook-form + zod; framer-motion seletivo.
- Supabase: Postgres + RLS + edge functions (`supabase/functions/`),
  migrations em `supabase/migrations/`. Núcleo agéntico: edge
  `eva-agent-loop` (function-calling, teto de 6 iterações) + tabelas
  `agent_tools`/`agent_runs`/`agent_steps`. Pagamentos: Mercado Pago.
  Analytics: GA4 + Google Ads + Meta Pixel + Clarity (carregados após 1ª
  interação).
- Quem dispara o agente (desde 24/08): cron `eva-agent-tick` às 9h BRT em dia
  útil, teto de 3 cards parados por empresa com WhatsApp ativo; e cron
  `eva-approval-notify` a cada 10min, que leva rascunho pendente pro WhatsApp
  do dono e expira o que passou de 48h. Catálogo em `agent_tools`: 10 tools,
  9 internas e só `draft_outbound_message` de saída. Para rodar na hora:
  `scripts/eva-tick-agora.sql`.
- Contexto do negócio: a EVA deduz sozinha das conversas
  (`eva-learn-from-conversations`, cron `eva-learn-context` toda segunda 10h
  BRT) e propõe em `eva_context_suggestions` com `source='conversations'` e
  `evidence` obrigatória. Quem aprova é o humano, na Base de Conhecimento ou no
  EVA Studio. O `eva-agent-loop` passou a ler `eva_business_context` no system
  prompt: sem isso o rascunho saía sem a voz da empresa.
- Fila ÚNICA de sugestão: `agent_suggestions`. Escrevem nela o
  `eva-agent-loop` e o `eva-stale-deal-followup` (kind='followup'), e as duas
  passam pela aprovação por WhatsApp (UNIFY.1, 2026-08-24).
  `eva_deal_suggestions` está CONGELADA: histórico migrado, nenhum código
  escreve nela, pode ser dropada quando o backup não for mais necessário.
- Travas da notificação (APPROVAL.2): teto de 5 entregas por empresa a cada
  24h, 5 tentativas por rascunho (`notify_attempts`) e corte do lote inteiro
  quando o socket do número cai. Sessão de WhatsApp fica 'active' no banco
  mesmo caída, então esta última é a que evita queimar a rodada.
- Rotas públicas/SEO em `App.tsx`; `/auth`, `/criar-conta` e o app
  autenticado (catch-all) em `AppShell.tsx`. `/onboarding` e `/register` são
  redirects de compatibilidade.
- Cadastro: trial Pro 14 dias SEM cartão; expirou → degrada pra Free em
  runtime (`resolveEffectivePlan`). Cartão só em `/upgrade` / Faturamento
  (`PlanCheckoutForm`, checkout transparente MP).
- CTAs: demo → `EvaDemoModal` (agenda real via `calendar-slots` +
  `calendar-book`); trial → `/criar-conta?plan=X`. `DemoScheduleSection` e
  `NativeScheduler` estão órfãos, não usar como referência.
- WhatsApp nativo: Evolution API (`evolution-whatsapp`,
  `evolution-message-webhook`); prospecção supervisionada com allowlist
  fail-closed (`validateChatOwnership`).

## UI: usar as skills, não improvisar

Qualquer trabalho de UI → skill `ui-polish` (tokens, sombras, easing,
estados, reduced-motion). Landing → skill `vyzon-landing-art-director`.
Vídeo de produto → skill `vyzon-product-film`. Tracking → skill
`analytics-tracking`.

## Self-verification (obrigatório antes de entregar)

1. **UI nova/alterada → olhar o render** (Playwright headless ou preview)
   antes de entregar. SVG sempre com width/height explícitos em atributo.
2. **Dado novo no front → verificar contrato real:** tipo da coluna
   (date vs string), unidade (contagem vs valor), empresa efetiva (regra 3).
3. **Query de dashboard:** fonte OPCIONAL falhando não derruba o painel
   (degradar com warning); resultado vazio suspeito → testar sob RLS
   simulando a sessão real.
4. Antes de push: `tsc --noEmit` + `npm run build` no mínimo; lógica nova
   roda `npm test`.

## Docs sob demanda (ler quando o tema entrar na tarefa)

- ICP e mensagem: `docs/vendas/01-ICP-ideal-customer-profile.md`,
  `docs/product/vyzon_agents_for_agencies.md`
- Agentes EVA (blueprint, ciclo de vida, Qualificador):
  `docs/product/vyzon_qualifier_agent_spec.md`
- API interna: `docs/api/` (52 edge functions catalogadas)

## Barra de qualidade (resumo do que era 6 seções)

SEO: HTML rastreável, 1 H1/página, meta+OG, JSON-LD sem claims inventadas,
noscript em sincronia. Acessibilidade: contraste AA, foco visível, teclado,
labels, `prefers-reduced-motion` em toda animação. Performance: sem dep
pesada nova, lazy abaixo da dobra (`LazyOnVisible`), sem CLS, mobile
primeiro (PageSpeed mobile 99 é o baseline a não regredir). Mobile: CTA
cedo, cards empilham, inputs ≥16px no iOS.

## Definition of Done

1. Posicionamento claro em ≤5s; copy orientada a dor; IA assistida.
2. Nenhuma claim não verificada; CTAs reusam rotas existentes.
3. `tsc --noEmit` + `npm run build` passam (ou falha documentada).
4. Report final: mudanças, arquivos, decisões, comandos rodados, status de
   build/test, riscos, próximos passos.
