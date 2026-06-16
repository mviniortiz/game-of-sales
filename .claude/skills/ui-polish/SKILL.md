---
name: ui-polish
description: >-
  Apply Vyzon's visual polish to ANY frontend/UI work in this repo — building or
  refining React + Tailwind components, landing sections, app screens, cards,
  buttons, modals, inputs, hover/press states, motion and transitions. Use
  whenever creating or changing UI so it matches the Vyzon design system: tokens,
  layered shadows, custom easing, typography, disciplined motion, and
  accessibility. Triggers on requests like "create a card", "add a hover effect",
  "build this section", "polish this screen", "make it look better".
---

# Vyzon UI Polish

Premium B2B SaaS, editorial-técnico. Clean, afiado, confiante — nunca lúdico.
Two surfaces, two token namespaces. **Pick the right one and never mix.**

- **Landing** (`/`, personas, comparativos) → namespace `--lp-*` (papel/tinta, editorial).
- **App** (Inbox, Pipeline, EVA, Config) → namespace `--vyz-*` (com dark mode via `.dark`).

Tokens live in `src/index.css`. Always use tokens, never hardcode hex when a token exists.

## Tokens — Landing (`--lp-*`)

- `--lp-paper: #faf9f5` (fundo) · `--lp-white: #ffffff` (cards)
- `--lp-ink: #0d1421` (texto) + escalas `--lp-ink-90/70/55/40`
- `--lp-blue: #1556c0` (CTA/acento) · `--lp-blue-deep: #0e3e8a`
- `--lp-eva: #6d28d9` (IA/EVA) · `--lp-live: #008a52` (status ao vivo)
- `--lp-line` / `--lp-line-soft` (hairlines) · `--lp-radius: 10px`

## Tokens — App (`--vyz-*`)

- Accent: `--vyz-accent: #2563EB`. Superfícies `--vyz-surface-1/2/3`, texto
  `--vyz-text-primary/strong/muted`, bordas `--vyz-border-subtle/border/strong`.
- Sombras prontas: `--vyz-shadow-cta`, `--vyz-shadow-panel`, `--vyz-shadow-mock`.
- Dark mode: tudo troca sob `.dark` — teste nos dois temas.

## Tipografia

- **Satoshi** (900/700) → headlines de marca (`.font-satoshi`).
- **Sentient** itálica → "voz humana" (citações, acentos editoriais na landing).
- **Sora / Inter** → UI e corpo. **mono** → telemetria/rótulos técnicos.
- Headlines grandes: `letter-spacing` negativo (-0.03 a -0.045em), `line-height` ~1.0.

## Regras de polish (faça)

1. **Sombra em camadas**, nunca uma só chapada. Ambient suave + key curta. Ex.:
   `box-shadow: 0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(37,99,235,0.18);`
2. **Easing custom**, nunca `linear`/`ease` default. Curva padrão do projeto:
   `cubic-bezier(0.22, 1, 0.36, 1)`. Durações curtas: hover 150–200ms, reveal ~600ms.
3. **Hover com intenção**: transform (translate/scale sutil) + mudança de sombra.
   Na landing, o vocabulário é o `lp-press` (sombra dura deslocada), não glow.
4. **Hairline + raio 10px**: borda fina (`--lp-line` / `--vyz-border`), cantos 10px.
   Evitar bordas grossas e raios grandes "fofos".
5. **Acento azul para ação, roxo só para EVA/IA.** Não usar roxo como cor geral.
6. **Densidade**: respiro generoso entre seções; dentro de cards, ritmo compacto.
7. **Estados completos**: hover, focus-visible, active, disabled, loading, empty.
8. **Texto secundário** via opacidade do ink (`--lp-ink-55/40`), não cinza aleatório.

## Motion (disciplinado — tendência 2026)

- Motion comunica estado/causa, não decora. Micro-interações com propósito.
- Reveal-on-scroll: usar `Reveal`/`StaggerContainer` (framer) ou `Rise`
  (`src/components/landing/animation/`). **Transform-only, nunca opacity isolada**
  (IO que não dispara em WebView deixaria conteúdo invisível).
- Landing prefere CSS puro (loops time-based); app usa framer seletivo.
- **`prefers-reduced-motion: reduce` é obrigatório** em toda animação — desliga
  loops/parallax/tilt e entrega o estado final estático.

## EVA (importante)

A EVA é **entidade abstrata** — o núcleo de plasma `EvaCoreVisual`
(`src/components/eva-studio/EvaCoreVisual.tsx`), reativo a estado
(idle/analyzing/ready/attention). **Não é avatar/rosto.** Em micro-contextos
(badges, ≤32px) use o glifo `EvaNode`. Nunca reintroduzir o avatar fotográfico.

## Acessibilidade & Performance

- Contraste AA, foco visível, navegação por teclado, labels claros, semântica.
- Nada crítico só por cor. Formulários acessíveis.
- Sem deps pesadas; visuais em CSS/HTML; lazy abaixo da dobra (`LazyOnVisible`);
  layout sem CLS; mobile primeiro.

## Não faça

- Não misturar `--lp-*` com `--vyz-*` na mesma superfície.
- Não usar glow/neon, gradientes berrantes, emojis decorativos na UI core.
- Não hardcodar cor quando há token. Não criar um estilo visual novo sem pedido.
- Não animar sem fallback de reduced-motion. Não reintroduzir avatar da EVA.

## Checklist antes de fechar

`[ ]` token namespace certo (landing vs app) · `[ ]` sombra em camadas ·
`[ ]` easing custom · `[ ]` hover/focus/active/disabled · `[ ]` reduced-motion ·
`[ ]` dark mode (se app) · `[ ]` mobile · `[ ]` sem hex hardcoded onde há token.
