# MediaBuyer OS — Enterprise Growth Engine

A single-page dashboard for media buyers and performance agencies. It consolidates
Meta / TikTok / Google ad spend into one view and answers the question those
platforms deliberately make hard: **after cost of goods, am I actually making money?**

The UI is Arabic (RTL).

## What it does

| Area | Capability |
| --- | --- |
| **Portfolio KPIs** | Blended ROAS, true CPA/CPL, net profit after COGS, with green/amber/red evaluation against per-portfolio targets |
| **Campaign hub** | Sortable table across platforms, inline daily-budget editing, pause/activate |
| **Creative intelligence** | Hook rate (3s) and hold rate (15s) per asset, with fatigue flags |
| **Lead CRM** | Kanban pipeline: registered → qualified → closed, attributed back to the campaign that produced the lead |
| **AI recommendations** | Scale / pause / creative-refresh suggestions with one-click apply |
| **Audit trail** | Append-only log of every budget, threshold and pipeline change |
| **Command palette** | `Cmd/Ctrl+K` to jump between portfolios and campaigns |
| **Multi-currency** | USD / EGP / SAR / EUR display conversion |

## Stack

React 19 · TypeScript · Vite 8 (rolldown) · Tailwind CSS v4 · Recharts · Supabase · Vitest · Oxlint

## Getting started

```bash
npm install
npm run dev
```

The app starts in **demo mode** and shows a banner saying so. All data comes from
`src/mock/mediaBuyerData.ts` and lives in memory — a page refresh discards every
change.

### Connecting a database

```bash
cp .env.example .env.local     # then fill in the two values
```

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key |

Apply `src/lib/schema.sql` to the project first. Leave both blank to stay in demo mode.

> **Anything prefixed `VITE_` is compiled into the public JS bundle.** Never put a
> `service_role` key, ad-platform app secret, or webhook signing secret in `.env` —
> those belong to server-side code only.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck, then production build |
| `npm run typecheck` | Types only |
| `npm run lint` | Oxlint |
| `npm run test` | Vitest (single run) |
| `npm run test:watch` | Vitest watch mode |
| `npm run test:coverage` | Coverage report |
| `npm run preview` | Serve the production build locally |

## Docker

```bash
docker build -t mediabuyer-os .
docker run --rm -p 8080:8080 mediabuyer-os
```

To bake in credentials (Vite inlines them at *build* time, not at container start):

```bash
docker build \
  --build-arg VITE_SUPABASE_URL=https://xxx.supabase.co \
  --build-arg VITE_SUPABASE_ANON_KEY=eyJ... \
  -t mediabuyer-os .
```

The image serves via nginx on port 8080 as a non-root user, with a `/healthz`
endpoint, security headers, a CSP, and immutable caching for hashed assets.

## Architecture

```
src/
├── App.tsx                    Container: state, handlers, tab routing
├── main.tsx                   Entry point + ErrorBoundary
├── components/                Presentational components (no data fetching)
├── services/
│   ├── apiService.ts          Single source of truth for all mutable data
│   └── webhookHandler.ts      Lead-ingestion simulation + shared validation
├── lib/
│   ├── config.ts              Env parsing; decides demo vs live mode
│   ├── supabaseClient.ts      Lazily-imported Supabase client (or null)
│   ├── format.ts              Currency/number formatting + FX rates
│   └── schema.sql             Postgres schema, RLS policies, triggers
├── types/mediaBuyer.ts        Domain types
└── mock/mediaBuyerData.ts     Demo seed data
```

Two rules keep the data layer honest:

1. **`apiService` owns all mutable collections.** Every mutator returns the *full*
   collection so React state is an exact mirror. Components never patch a
   collection directly — doing so previously let React state and the store
   diverge, and the next unrelated mutation silently reverted the change.
2. **Derived metrics are never written piecemeal.** ROAS, CPA, CPL, CTR, CPM,
   CPC, hook rate, hold rate and net profit are all recomputed together from raw
   counters, so they cannot contradict each other.

## Production readiness

This is a **working prototype with a production-shaped data layer**, not a
deployable multi-tenant product. Before it handles real client money:

- **Authentication is not implemented.** `schema.sql` defines RLS policies keyed
  on `auth.uid()` and an RBAC model (`owner` / `media_buyer` / `client_viewer`),
  but the app never signs anyone in. Wire up Supabase Auth before exposing it.
- **Writes are local only.** Only `portfolios` is read from and written to
  Supabase; campaigns, leads and audit logs live in memory.
- **Webhook ingestion must move server-side.** `webhookHandler.ts` simulates the
  *result* of an inbound lead. Real Meta/TikTok Lead Ads ingestion needs a server
  endpoint that verifies the HMAC signature with the app secret — a browser
  cannot do this, since any secret it holds is public. See the module header.
- **FX rates are hardcoded.** `CURRENCY_RATES` in `src/lib/format.ts` are static
  placeholders. Reporting client revenue at a stale rate misstates financials;
  source them from an FX provider with a timestamp.
- **No observability.** `ErrorBoundary` logs to the console; there is no error
  reporter, no metrics, and no alerting.
