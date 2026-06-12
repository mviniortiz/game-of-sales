# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

> **Atualizado em 2026-06-12.** Substitui o posicionamento horizontal antigo
> ("CRM gamificado") pelo posicionamento atual em produção: **Central Comercial
> com EVA para agências que vendem por conversa**. Sempre verifique no código
> antes de afirmar capacidades (ver "Claims Policy").

## Project Overview

**Vyzon** é a **Central Comercial com EVA** para **agências que vendem por
conversa**. O lead chega pelo WhatsApp/Instagram/formulário, a **EVA** (a
camada de inteligência da plataforma) lê cada atendimento, aponta quem está
pronto para avançar e sugere o próximo passo. O time aprova e a oportunidade
segue no pipeline.

Posicionamento canônico (em produção em `index.html` / homepage):

> **Pare de perder leads no WhatsApp.**
> A Central Comercial para agências que vendem por conversa. A EVA lê cada
> atendimento, aponta quem está pronto para avançar e sugere o próximo passo.
> Seu time aprova e a oportunidade segue no pipeline.

O produto resolve a dor central das agências: **lead frio porque ninguém
respondeu a tempo, qualificação ruim, follow-up esquecido e pipeline que não
reflete o que aconteceu na conversa.**

### Princípio inegociável — agentes assistidos

A EVA e seus agentes são **assistidos, com humano no controle das mensagens
de saída**. O modelo de autonomia vigente é **HÍBRIDO** (decisão do produto,
2026-06-12):

- **Pode ser automático:** criar/atualizar o card de oportunidade no pipeline
  a partir de um lead que **já entrou** (inbound), com os campos qualificados
  preenchidos. Isso é trabalho interno sobre dado que já chegou.
- **Sempre exige aprovação humana:** qualquer **mensagem de saída** para o lead
  (abordagem, follow-up, resposta) — padrão "aprovar-e-enviar". Nenhum agente
  dispara mensagem sozinho.
- **Nunca:** scraping/enriquecimento por fonte externa (Google/LinkedIn),
  promessa de resultado, ou substituir o vendedor na condução da conversa.

Isso está cristalizado na marca: **"A EVA sugere, seu time aprova."**

## Brand

Vyzon deve parecer um SaaS B2B premium, moderno e editorial-técnico.

Direção de marca: clean, afiada, premium, confiante (não lúdica), focada em
performance comercial. A landing usa uma linguagem editorial ("o fio da
conversa"): papel, tinta, hairlines, voz serif itálica (humano) + mono
(máquina/telemetria).

### Design tokens reais da landing (`src/index.css`, namespace `--lp-*`)

- Papel (fundo): `--lp-paper: #faf9f5`
- Tinta / navy (texto): `--lp-ink: #0d1421`
- Azul elétrico (CTA/acento primário): `--lp-blue: #1556c0` (deep `#0e3e8a`)
- Roxo da EVA (IA): `--lp-eva: #6d28d9`
- Verde "ao vivo": `--lp-live: #008a52`
- Hairlines: `--lp-line` / `--lp-line-soft`; raio: `--lp-radius: 10px`

Fontes: **Satoshi** (headlines), **Sentient** itálica (voz humana/serif),
**Sora**/**Inter** (UI), **mono** (telemetria). Tokens de app em `--vyz-*`
com dark mode (`.dark`). Não introduzir um estilo visual não relacionado sem
pedido explícito.

## ICP (Ideal Customer Profile)

**Agências de marketing e serviços digitais brasileiras que vendem por
conversa** (ver `docs/product/vyzon_agents_for_agencies.md` e
`docs/vendas/01-ICP-ideal-customer-profile.md`).

- **Tipo:** tráfego pago, social media, criação de sites/landing, lançamentos,
  branding, consultorias e produtoras de conteúdo.
- **Tamanho:** 3 a 30 pessoas; comercial feito por 1–5 (dono + closer + SDR
  informal).
- **Canais:** WhatsApp (principal), Instagram/DM, formulário, indicação,
  tráfego pago. Entrada quase toda por **conversa**, não por formulário.
- **Maturidade:** baixa/média — "tem CRM no nome" mas usa planilha + WhatsApp +
  memória; sem playbook, sem SLA de resposta, sem critério de qualificação.

Segmentos adjacentes citados no ICP de vendas (imobiliárias, corretoras,
energia solar, infoprodutos, SaaS B2B) existem como expansão, mas a **mensagem
principal é agências**. Páginas de persona já existem: `/para-infoprodutores`,
`/para-saas-b2b`.

## Messaging Hierarchy

A homepage deve responder rápido (≤5s):

1. O que é Vyzon? → Central Comercial com EVA.
2. Para quem? → Agências que vendem por conversa.
3. Que dor resolve? → Lead perdido no WhatsApp, follow-up esquecido, pipeline
   desconectado da conversa.
4. Por que é diferente? → A EVA lê a conversa e sugere; o time aprova.
5. Como funciona? → Inbox → EVA analisa → time aprova → pipeline.
6. Próximo passo? → Agendar demo gratuita / Testar grátis 14 dias.

## Copy Principles

Copy orientada a dor e à conversa, nunca feature seca. Evitar "CRM
gamificado", "venda mais", "automatize suas vendas", "robô que vende sozinho".

Preferir: "Pare de perder leads no WhatsApp", "A EVA lê a conversa e aponta
quem está pronto", "Follow-up que não depende de cobrança no grupo",
"O pipeline finalmente reflete o que aconteceu na conversa".

Enquadrar a IA como **camada assistida** ("a EVA sugere, seu time aprova"),
nunca como automação total ou substituição do vendedor.

## EVA & Agentes (núcleo do produto)

A EVA é a camada-mãe de inteligência. Os **agentes** são especializações dela,
configurados pelo gestor e amarrados ao **contexto da empresa**.

### Contexto da empresa (o que alimenta a EVA)

Configurado em **Configurações → EVA** (`src/components/configuracoes/eva/*`):
serviços, ICP, tom de voz, objeções, playbooks e materiais aprovados (base de
conhecimento). Nada entra no contexto da EVA sem aprovação. Tabelas `eva_*`
(`eva_blueprints`, `eva_business_context`, `eva_simulation_results`,
`eva_deal_suggestions`, `eva_training_documents`, etc.).

### Agent Studio (EVA Studio evoluído)

O motor do EVA Studio (blueprint persistente + memória + regras + simulações +
aprovação) configura **agentes especializados**. Dimensão `agent_key`
(`qualifier`, `followup`, `objection`, `proposal`, `manager`). MVP = **Agente
Qualificador**. Specs de referência: `docs/product/vyzon_agents_for_agencies.md`
(VYZON.AGENTS.1) e `vyzon_qualifier_agent_spec.md` (VYZON.AGENTS.2).

### Agente Qualificador (MVP)

Lê a conversa do lead e produz um **diagnóstico**: campos detectados
(orçamento, segmento, urgência, decisor, prazo…), score (verde/amarelo/
vermelho), tags sugeridas, perguntas recomendadas e próxima ação. No modelo
**híbrido**: ao qualificar um lead inbound, **cria/atualiza o card no pipeline
com os campos preenchidos**; qualquer mensagem de saída fica como rascunho na
fila "aprovar-e-enviar". Toda geração é proposta auditável (`agent_suggestions`).

### Ciclo de vida e auditoria

- **Config do agente** (`eva_blueprints.status`): `draft → in_review →
  ready_to_test → prepared → published_preview`. Só publica sugestões ao vivo
  quando preparado/aprovado.
- **Sugestão em runtime** (`agent_suggestions.status`): `pending → accepted |
  adjusted | rejected | expired`, com `applied_payload` e `feedback`.
- Permissões: **admin** configura/aprova; **membro** usa e registra desfecho;
  **super_admin** bypassa. RLS por `company_id` (padrão do projeto).

### Prospecção outbound supervisionada (existente)

`prospecting_instances` + `prospecting_allowlist` (PROSPECT.1): um número em
modo prospecção só conversa com a allowlist; tudo fora é descartado no webhook
(`evolution-message-webhook`), protegendo a vida pessoal. Envio é
**aprovar-e-enviar**. `validateChatOwnership` é fail-CLOSED.

## Pricing (verificado em `src/data/landing/pricing.ts`)

3 planos, assinatura via Mercado Pago. **Verificar o arquivo antes de citar
valores em copy** — eles mudam:

- **Starter** — R$ 147/mês
- **Plus** — R$ 397/mês (popular)
- **Pro** — R$ 797/mês ("Falar com especialista" → booking externo)

14 dias grátis sem cartão (`/onboarding?plan=plus`).

## Integrations (verificado em `src/config/integrationsConfig.ts`)

**Nunca inventar integração.** As reais (webhooks/conectores no código):

- **Vendas/infoproduto:** Hotmart, Kiwify, Greenn, Cakto, Braip, Monetizze,
  Eduzz.
- **B2B / cobrança / pagamento:** RD Station, Asaas, Mercado Pago.
- **Produtividade / genérico:** Zapier, Notazz, Webhooks/API por token.
- **Canal nativo:** WhatsApp via **Evolution API** (`evolution-whatsapp`,
  `evolution-message-webhook`).
- **Em roadmap / sob consulta:** Stripe, Pagar.me.

Se uma integração não estiver confirmada no código, usar "Em breve", "Sob
consulta" ou "Integração via API/Webhook".

## Stack & Architecture

- **Frontend:** Vite + React 18 + TypeScript + Tailwind + shadcn/ui (Radix).
  Roteamento: React Router v6 (`src/App.tsx`). Estado de servidor:
  `@tanstack/react-query`. Formulários: react-hook-form + zod. Animação:
  framer-motion (seletivo) + CSS (landing).
- **Backend:** Supabase (Postgres + RLS + Edge Functions em `supabase/functions/`).
  Cliente em `src/integrations/supabase/`. Migrations em `supabase/migrations/`.
- **Pagamentos:** Mercado Pago (assinaturas). **Analytics:** GA4 + Google Ads +
  Meta Pixel + Clarity (carregados após 1ª interação).
- **Vídeo:** Remotion (`remotion/`). **Build:** `vite build` +
  `scripts/prerender-seo.mjs` (HTML por slug para crawlers).

### Rotas públicas principais

`/` (landing), `/auth`, `/onboarding?plan=starter|plus|pro`,
`/para-infoprodutores`, `/para-saas-b2b`, `/alternativa-*`, `/alternativas`,
`/changelog`, `/politica-privacidade`, `/termos-de-servico`. App autenticado
em catch-all (`AppShell`): Inbox, Pipeline, Deal (`DealCommandCenter`), EVA
(`/eva`), EVA/Agent Studio, Configurações, Performance, Metas.

## Database conventions (migrations)

- Aplicar **sempre** via `npx supabase db query --linked -f <arquivo>` —
  **NUNCA `db push`**.
- **GRANT antes de habilitar RLS** (`grant ... to authenticated; grant all to
  service_role;` depois `enable row level security`).
- Helpers de RLS: `public.is_super_admin()`, `public.get_my_company_id()`,
  `public.has_role(auth.uid(), 'admin'::public.app_role)`.
- Trigger de timestamp: `public.update_updated_at()`.
- Escopo por `company_id`. Mudanças **aditivas** e backward-compatible; colunas
  novas com `default` para não quebrar linhas existentes.

## CTA Rules

- "Agendar demo gratuita" → seção/fluxo de agendamento (`#agendar-demo`,
  `DemoScheduleSection`).
- "Testar grátis por 14 dias" / "Começar teste grátis" → `/onboarding?plan=plus`.
- "Falar com especialista" (Pro) → link de booking externo definido em
  `pricing.ts`. Não inventar URLs; reusar rotas existentes e marcar TODO se
  faltar.

## SEO Requirements

HTML real e rastreável. Requisitos: um H1 por página; HTML semântico; title e
meta description descritivos; Open Graph + Twitter card; alt text (vazio em
decorativas); JSON-LD (`SoftwareApplication`, `Organization`, `FAQPage`) já
presente em `index.html`; `<noscript>` rico mantido em sincronia.

Title atual: `Vyzon | Central Comercial com EVA para agências que vendem por
conversa`. Não inventar ratings, reviews, pricing, clientes, integrações ou
métricas em dados estruturados.

## Accessibility Requirements

Contraste adequado; foco visível; navegação por teclado; labels claros; seções
semânticas; formulários acessíveis; nada crítico só por cor; `prefers-reduced-
motion` em toda animação (a landing já respeita — ver `src/index.css`).

## Performance Requirements

Sem dependências pesadas desnecessárias. Preferir componentes leves, visuais
CSS/HTML, lazy-load abaixo da dobra (`LazyOnVisible`), animação barata,
layout sem CLS. Boa performance no mobile é obrigatória.

## Responsive Design

Funcionar de mobile pequeno a wide. No mobile: H1 legível, CTA cedo, hero não
empurra CTA pra baixo demais, cards empilham, navegação usável.

## Engineering Rules

Antes de mudar: inspecionar repo; identificar stack, rotas, design system,
componentes e tokens; identificar CTAs/forms e integrações confirmadas.

Durante: preservar arquitetura; reusar componentes; evitar duplicação e deps
desnecessárias; código idiomático e modular; preservar páginas legais,
analytics e código funcional; não inventar comportamento de backend.

Depois: rodar checks disponíveis (instalar se preciso → lint → typecheck →
testes → build); corrigir o que der; reportar pendências honestamente.

Comandos: `npm run lint`, `npx tsc -p tsconfig.app.json --noEmit`,
`npm test` (vitest), `npm run test:e2e` (playwright), `npm run build`.

## Claims Policy

**Não afirmar** resultados de clientes, aumento de conversão/receita, nº de
usuários/clientes, ratings, depoimentos, integrações, features de IA,
capacidades de WhatsApp/automação/pagamento — **a menos que verificadas** no
código, documentação, env, copy existente ou fornecidas pelo usuário. Na
dúvida, linguagem cautelosa.

Em especial: descrever a IA como **assistida (híbrida)** conforme o princípio
acima. Não prometer "agente que vende/aborda sozinho" — a abordagem de saída
sempre passa por aprovação humana.

## Definition of Done

1. Comunica o posicionamento (Central Comercial com EVA para agências) com
   clareza, entendível em ≤5s.
2. Copy orientada a dor/conversa; IA enquadrada como assistida/híbrida.
3. ICP de agências claro; CTAs visíveis e repetidos.
4. Conteúdo core em HTML rastreável; SEO e acessibilidade básicos.
5. Mobile funciona; links legais acessíveis.
6. Nenhuma claim não verificada introduzida.
7. Migrations aditivas com GRANT+RLS por empresa; nada vai a produção sem OK.
8. `tsc --noEmit` e `vite build` passam (ou falha documentada com causa).

## Final Report Format

Após qualquer tarefa: Resumo das mudanças; Arquivos alterados; Decisões de
posicionamento/copy; Decisões técnicas; SEO/acessibilidade; Comandos rodados;
Status de build/lint/test; Riscos/assunções; Próximos passos.

## Operating Principle

Priorizar conversão e clareza sobre complexidade decorativa. Cada seção deve
responder ao menos uma de: para quem é? que dor resolve? por que importa? como
funciona? por que confiar? qual o próximo passo?
