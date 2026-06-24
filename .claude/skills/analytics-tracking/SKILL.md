---
name: analytics-tracking
description: Convenção de tracking/analytics do Vyzon — como instrumentar eventos em GA4 + Google Ads + Microsoft Clarity de forma consistente. Use ao adicionar eventos, custom tags, conversões, ou instrumentar fluxos (demo, EVA, navegação, funil). Triggers: "adicionar tracking", "evento de analytics", "Clarity", "dataLayer", "GA4", "instrumentar".
---

# Analytics & Tracking — Vyzon

Toda a instrumentação passa por `src/lib/analytics.ts`. **Nunca** chame
`window.gtag`/`window.clarity` direto nos componentes — use os helpers (eles têm
`try/catch`: analytics NUNCA pode quebrar o app).

## Stack
- **GA4** (`G-YK8230WKT3`) + **Google Ads** (`AW-18055201052`) via `gtag.js` —
  carregado por `initAnalytics()` após a 1ª interação (lazy, anti-TBT).
- **Microsoft Clarity** (`wd4vh454ta`) — stub no `index.html`, carrega após a 1ª
  interação. Antes disso `window.clarity` é `undefined` → os wrappers no-op.
- **Meta Pixel** — inline no `index.html`.
- NÃO há GTM container; "dataLayer" = eventos `gtag` (o `trackEvent` já alimenta).

## Helpers (em `@/lib/analytics`)
| Helper | Quando usar |
|---|---|
| `trackEvent(name, params?)` | Evento só pra GA4 + Ads. |
| `trackBehavior(name, params?)` | **Padrão pra comportamento**: dispara em GA4 **e** Clarity de uma vez. |
| `claritySet(key, value)` | Tag de sessão filtrável no painel Clarity (string ou lista). |
| `clarityEvent(name)` | Smart event no Clarity (já incluso no `trackBehavior`). |
| `clarityIdentify(id, friendlyName?)` | Liga a sessão a um id estável (ex.: demo id). |
| `clarityUpgrade(reason)` | **Prioriza a gravação** desta sessão (momentos de valor: aha da EVA, off-flow, CTA). |
| `trackConversion` / `trackDemoConversion` / `trackPurchaseConversion` | Conversões do Google Ads (com `send_to`). |
| `isDemoSession()` | True se a sessão é demo (flag `sessionStorage.vyzon_demo` ou app em iframe). |

## Convenções
1. **Comportamento → `trackBehavior`** (vai pros dois destinos). Conversão de
   negócio → `trackConversion`/`trackDemoConversion`.
2. **Nomes de evento**: snake_case, centralizados em `FUNNEL_EVENTS` (funil) e
   `DEMO_EVENTS` (demo/EVA/nav). Adicione novos lá, não invente string solta.
3. **Tags de sessão** (`claritySet`) pra segmentar no painel: `demo`, `eva_step`,
   `last_tab`. Tags levam ~30min–2h pra virar filtro no Clarity.
4. **`clarityUpgrade`** só em momentos que você quer ASSISTIR depois (não em todo
   evento, senão perde o sentido de priorização).
5. Params de evento: `Record<string, string|number|boolean>` (sem objetos
   aninhados — GA4 não aceita).

## Taxonomia da demo/EVA (`DEMO_EVENTS`) — já instrumentada
- `demo_start` — início da demo (EmbedDemo + tour de voz DemoLiveStage).
- `eva_step_view` (+ tag `eva_step`) — cada tela que a EVA apresenta no tour
  (`DemoLiveStage.startStep`).
- `nav_tab_click` (+ tag `last_tab`) — clique em aba da sidebar (`AppSidebar`).
- `nav_off_flow` — clique manual de aba DURANTE a demo (= saiu do roteiro da EVA;
  na demo a EVA navega por postMessage, então clique de sidebar é sempre off-flow).
- `eva_suggestion_shown` / `eva_suggestion_accepted` / `eva_suggestion_adjusted` —
  ciclo da resposta sugerida no `EvaPanel`.

## Onde verificar
- **Clarity**: `clarity.microsoft.com/projects/view/wd4vh454ta` → Filters (custom
  tags) + smart events. API agregada: ver [[reference_clarity_api]] (10 req/dia).
- **GA4**: Realtime/DebugView pra eventos; eventos custom viram dimensões.

## Não faça
- Não chamar `window.gtag`/`window.clarity` cru no componente.
- Não deixar analytics jogar exceção (sempre via helper com try/catch).
- Não mandar PII em params/tags (e-mail/telefone só hasheado nas Enhanced
  Conversions, como já faz o `trackDemoConversion`).
