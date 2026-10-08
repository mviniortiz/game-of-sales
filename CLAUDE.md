# CLAUDE.md — Vyzon (game-of-sales)

> **Vyzon é para integradores de energia solar que vendem pelo WhatsApp.**
> A EVA acompanha cada proposta que sai do WhatsApp, avisa no 2º dia sem
> resposta e entrega a retomada pronta; o dono responde 1 e ela sai do número
> dele. Entrada comercial: Raio-X grátis das propostas paradas. Posicionamento
> canônico em produção: `index.html` + `src/pages/SolarLanding.tsx`.
> (Atualizado 2026-10-08: o nicho de agências foi abandonado e /agencias
> redireciona para a home.)

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
- **Nunca:** buscar dado de lead fora do WhatsApp (scraping/enriquecimento
  de contato), promessa de resultado, substituir o vendedor. Exceção única
  (08/10/2026): o site da PRÓPRIA empresa do usuário pode ser lido quando ele
  digita o endereço na configuração da EVA (`eva-site-context`), e nada é
  gravado sem ele confirmar o resumo. Slogan segue válido pra saída:
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
   genérica; roxo `#6d28d9` só como micro-acento. EVA é um ícone vivo
   no jeito do Grok Bot (decisão do Markus em 08/10/2026): corpo arredondado
   e dois olhos que mudam de forma por estado, feito em CSS
   (`src/components/eva/EvaBot.tsx`). Nunca personagem com rosto realista,
   corpo ou estilo anime.
6. **Fonte de verdade > prosa.** Antes de citar em copy, LER:
   - Preços/planos: `src/config/plans.ts` (limites hardcoded nas edges
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
  `evidence` obrigatória. Quem aprova é o humano, no EVA Studio. Conta nova
  sem contexto cai em `/configurar-eva` (desde 08/10/2026): a EVA lê o site,
  pergunta só o que faltou e grava `eva_business_context` depois do "É isso"
  (`src/lib/eva/setupContext.ts`). Sem isso, parte do pacote do segmento
  (`src/lib/eva/blueprint.ts`). O
  `eva-agent-loop` lê `eva_business_context` no system prompt: sem isso o
  rascunho saía sem a voz da empresa.
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
- Plano único "Vyzon" R$ 497 (id `pro`). SEM teste grátis (08/10/2026): conta
  nova nasce free/inactive (o `guard_company_billing` força) e o grátis é o
  Raio-X automático (`/raio-x` → edge `raio-x-build` em modo dono → relatório
  em `/relatorio/:token`, que o dono confere e corrige). Paga = assinatura
  `active` (`company_is_paid()` no banco, `usePlano()` no front). Sem
  assinatura: só placar, assinatura, conta e ajuda (`rotaGratis`); a EVA não
  lê, não rascunha, não roda agente nem aprende (filtro nas funções de cron).
  Cobrança MANUAL desde 08/10/2026: /upgrade abre o WhatsApp do Markus, ele
  manda link do Mercado Pago e marca "Pago" em AdminCompanyDetail. Plano e
  assinatura só mudam por service_role ou super admin (trigger
  `guard_company_billing`). Edges mercadopago-* estão dormentes e o webhook
  não valida assinatura; não religar sem consertar.
- CTAs: home solar → Raio-X automático (`/criar-conta?segmento=energia_solar`,
  o cadastro dispara o Lead do pixel) e, como segunda opção, o formulário do
  Raio-X com o Markus (`demo_requests` source='orcamento_teste') ou WhatsApp. `DemoScheduleSection` e
  `NativeScheduler` estão órfãos, não usar como referência.
- WhatsApp nativo (QR, não oficial): servidor Whatsmiau no Railway, que fala
  as rotas da Evolution, por isso as edges seguem `evolution-whatsapp` e
  `evolution-message-webhook` e os secrets `EVOLUTION_API_*` (desde
  07/10/2026; guia em `infra/whatsmiau/README.md`). Mídia chega dentro do
  webhook e histórico por `messages.set`; não existe `findChats`,
  `findMessages` nem `getBase64FromMediaMessage`. API oficial: Kapso.
  Prospecção supervisionada com allowlist fail-closed
  (`validateChatOwnership`).

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
