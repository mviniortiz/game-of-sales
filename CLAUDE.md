# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Vyzon (game-of-sales)** — Brazilian-Portuguese sales gamification & CRM SaaS. Vite + React 18 + TypeScript SPA on the front end, Supabase (Postgres + Edge Functions) on the back end, deployed to Vercel. UI in pt-BR; code identifiers and comments mix English and Portuguese (follow whatever the surrounding file does).

## Commands

```sh
npm run dev              # Vite dev server on http://localhost:8080 (host '::')
npm run build            # production build (target es2020, manual chunks for vendor splits)
npm run build:dev        # dev-mode build
npm run preview          # serve the production build locally
npm run lint             # ESLint over **/*.{ts,tsx} (warnings allowed; CI does not gate on lint)

npm run test             # Vitest (jsdom, src/**/*.{test,spec}.{ts,tsx}, setup in vitest.setup.ts)
npm run test:ui          # Vitest UI
npm run test:coverage    # v8 coverage
npm run test:e2e         # Playwright (e2e/, baseURL http://localhost:8080, autostarts dev server)
npm run test:e2e:ui      # Playwright UI

# Single test
npx vitest run src/__tests__/utils.test.ts
npx vitest run -t "test name pattern"
npx playwright test e2e/landing-page.spec.ts

# Remotion (marketing videos under remotion/)
npm run remotion:studio
npm run remotion:preview
npm run remotion:sales            # renders public/videos/sales-video.mp4
npm run remotion:sales-square
npm run remotion:sales-vertical45

# Google Ads CLI (scripts/ads/, OAuth token via GOOGLE_ADS_TOKEN env or /tmp/ga_token.txt)
npm run ads:sitelinks
npm run ads:negatives
npm run ads:keywords:fix-match
npm run ads:persona-sitelink
```

There is no typecheck script; `tsc` config is loose (`strict: false`, `strictNullChecks: false`, `noImplicitAny: false`). Lint and tests are the only automated checks.

Path alias: `@/*` → `./src/*` (configured in `vite.config.ts`, `tsconfig.app.json`, `vitest.config.ts`, and `components.json`).

## Architecture

### Two-stage routing (lazy app shell)

`src/main.tsx` → `src/App.tsx` (public/marketing-only routes, eagerly loads only `LandingPage`) → catch-all `*` lazy-loads `src/AppShell.tsx` (everything else: auth, dashboard, CRM, admin, settings, etc.).

This split is intentional: marketing pages must be fast and don't need React Query, Supabase auth, or providers. **Don't move app routes into `App.tsx` or marketing routes into `AppShell.tsx`** — you'll bloat the landing bundle or duplicate providers. New persona/landing pages go in `App.tsx`; new authenticated app pages go inside `AppShell.tsx` under the appropriate `ProtectedRoute` / `AdminRoute` wrapping.

`AppShell.tsx` wires the global providers in this order: `QueryClientProvider` → `AuthProvider` → `TenantProvider` → `TooltipProvider`. React Query defaults: `staleTime 30s`, `gcTime 5min`, `refetchOnWindowFocus: false`, `retry: 1`.

### Auth + multi-tenancy

`AuthContext` (`src/contexts/AuthContext.tsx`) owns the Supabase session and a `profiles` row (`nome`, `avatar_url`, `is_super_admin`, `company_id`). It enforces an integrity rule: a non-super-admin user **must** have a `company_id` — if not, it forces sign-out. Token-refresh events for the same user are short-circuited to avoid re-rendering the tree.

`TenantContext` (`src/contexts/TenantContext.tsx`) owns `activeCompanyId` (persisted in `localStorage.activeCompanyId`) and the active company's plan. Super admins see all `companies`; regular users see only their own. `switchCompany` invalidates a fixed allowlist of React Query keys (`deals`, `profiles`, `vendas`, `products`, `companies`, `pipelines`, `deal-activities`, `custom-fields`) — when adding a new tenant-scoped query, add its key here or stale data will leak across tenant switches.

Plan gating lives in `src/config/planConfig.ts` (`starter` / `plus` / `pro`). Use `useTenant().hasFeature('eva' | 'metas' | …)`; super admins bypass all restrictions. `getUserLimit()` and `getProductLimit()` enforce seat/SKU caps.

Route guards: `ProtectedRoute` (must be signed in, redirects to `/onboarding?step=2` if profile exists without company), `AdminRoute` (super admin only), and a local `PreProdRoute` inside `AppShell` for super-admin-only pages.

### Supabase

Single client at `src/integrations/supabase/client.ts` reading `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`. **`src/integrations/supabase/types.ts` is auto-generated — do not hand-edit.** Always import as `import { supabase } from "@/integrations/supabase/client"`.

Backend layout under `supabase/`:
- `migrations/` — 80+ timestamped SQL files. The CI workflow `.github/workflows/migrations-guard.yml` blocks `DROP TABLE`, `DROP COLUMN`, and `TRUNCATE` without `IF EXISTS` (override per-line with `-- migrations-guard: allow-destructive`) and forbids `supabase db push` anywhere in scripts/`package.json` (apply migrations one at a time via `supabase db query --linked -f <file>`).
- `functions/` — 46 Deno edge functions: payment/CRM webhooks (`hotmart-webhook`, `kiwify-webhook`, `mercadopago-webhook`, `stripe-webhook`, `asaas-webhook`, `cakto-webhook`, `eduzz-webhook`, `braip-webhook`, `greenn-webhook`, `monetizze-webhook`, `notazz-webhook`, `pagarme-webhook`, `rdstation-webhook`, `zapier-webhook`), Twilio voice (`deal-call-*`, `twilio-voice-*`), Google Calendar/OAuth, Evolution WhatsApp, Eva AI agent (`eva-stale-deal-followup`, `report-agent`, `whatsapp-copilot`), and admin tooling. Functions in `supabase/config.toml` with `verify_jwt = false` are **public** — they must validate caller identity / webhook signatures themselves.

Edge-function secrets are set with `supabase secrets set` (see `.env.example` for the full list: `OPENAI_API_KEY`, `TWILIO_*`, `GOOGLE_CLIENT_*`, `RESEND_API_KEY`, `EVOLUTION_API_*`, `MERCADOPAGO_*`, `ELEVENLABS_API_KEY`, etc.). Frontend env vars must be prefixed `VITE_`.

### Frontend layout (`src/`)

- `pages/` — top-level route components (`Dashboard`, `CRM`, `Ranking`, `Metas`, `Calls`, `Calendario`, `NovaVenda`, `Pulse`, `Admin*`, `SalesPerformanceCenter`, persona landings under `pages/personas/` and `pages/alternativas/`, settings tabs under `pages/configuracoes/`).
- `components/` — feature-grouped (`crm/`, `dashboard/`, `vendas/`, `metas/`, `calls/`, `calendar/`, `whatsapp/`, `eva/`, `landing/`, `admin/`, `onboarding/`, `configuracoes/`, `layout/`, etc.) plus `components/ui/` (shadcn/ui primitives).
- `contexts/` — `AuthContext`, `TenantContext`. Add new app-wide state here, mounted inside `AppShell`.
- `hooks/` — domain hooks (`usePlan`, `useTrial`, `useOnboarding`, `useReminders`, `useEvolutionAPI`, `useReportAgent`, `useCustomFields`, `useDealTags`, `useWhatsAppTemplates`, etc.).
- `config/planConfig.ts`, `config/features.ts`, `config/integrationsConfig.ts`, `config/plans.ts` — plan/feature flags and integration metadata.
- `lib/` — cross-cutting helpers: `analytics.ts`, `attribution.ts`, `mercadopago.ts`, `rateLimiter.ts`, `sentry.ts`, `utils.ts` (shadcn `cn`).
- `utils/logger.ts` — **use this instead of `console.*`**. `logger.log/warn/info/debug` no-op in production; `logger.error` always logs.
- `integrations/supabase/` — generated client + types only.

### shadcn/ui

Configured in `components.json` (style `default`, base color `slate`, no prefix). Add new primitives with the shadcn CLI; they land in `src/components/ui/`. Aliases: `@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`.

### Remotion

Video compositions live in `remotion/` (`Root.tsx` registers compositions, `scenes/` holds individual scenes). `remotion.config.ts` enables Tailwind via `@remotion/tailwind`. Render outputs to `out/` (gitignored) or `public/videos/`.

## Conventions

- **Tone & language:** UI strings are pt-BR. Comments and commit messages are usually pt-BR as well. Match the file you're editing.
- **No `console.*` in app code:** import `logger` from `@/utils/logger`.
- **Imports:** always use the `@/` alias for cross-directory imports.
- **Tenant-scoped queries:** any new React Query key that depends on the active company must be added to `switchCompany`'s `invalidateQueries` list in `TenantContext.tsx`.
- **Plan gating:** read with `useTenant().hasFeature(...)`; never check `currentPlan === 'pro'` directly.
- **Migrations:** never write `DROP TABLE`/`DROP COLUMN`/`TRUNCATE` without `IF EXISTS`; never run `supabase db push` (CI blocks both). Apply individually with `supabase db query --linked -f <file>`.
- **Public edge functions** (`verify_jwt = false` in `supabase/config.toml`): must validate webhook signatures or auth themselves. Don't add new ones unless necessary.
- **Generated files:** `src/integrations/supabase/types.ts` is regenerated from the Supabase schema — don't edit by hand.

## Deployment

Production deploys via Vercel (`vercel.json` configures security headers, asset caching, and SPA rewrite of `/(.*)` → `/index.html`). The `gamesales.com.br` host is permanently redirected to `vyzon.com.br`. There is also a `.github/workflows/deploy.yml` that publishes to GitHub Pages on push to `main`/`master` (legacy / fallback path).
