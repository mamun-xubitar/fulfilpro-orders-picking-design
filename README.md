# FulfilPro — Order Fulfillment

FulfilPro is an internal operations system for a supplier that sells through several partner
**Shopify** stores. It does five things:

1. Publishes one hub catalogue to every connected store.
2. Pulls those stores' orders into a single queue.
3. Drives the physical fulfilment path: allocate stock, pick, decorate (print / embroidery /
   sewing), and pack.
4. Confirms fulfilment back to Shopify.
5. Tracks each parcel until it is delivered.

There is no self-signup. Admins create every account, and each of the seven roles (admin, staff,
test user, order picker, and the print / embroidery / sewing decorators) sees its own slice of the
app.

> Product model, roles, and principles: [PRODUCT.md](PRODUCT.md) ·
> Visual design system: [DESIGN.md](DESIGN.md) ·
> Code architecture (binding): [ARCHITECTURE.md](ARCHITECTURE.md)

---

## Contents

- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Background workers](#background-workers)
- [Shopify integration](#shopify-integration)
- [Production (PM2)](#production-pm2)
- [Scripts reference](#scripts-reference)
- [Project structure](#project-structure)
- [Conventions & quality gates](#conventions--quality-gates)
- [Documentation map](#documentation-map)

---

## Tech stack

| Area | Choice |
|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) — this version has breaking changes; see [AGENTS.md](AGENTS.md) |
| UI | React 19, Tailwind CSS v4 (`@tailwindcss/postcss`), react-toastify |
| Language | TypeScript (strict) |
| Database | PostgreSQL via **Prisma 7** with `@prisma/adapter-pg` |
| Auth | NextAuth v5 — credentials provider, JWT sessions, role-based route gate (`proxy.ts`) |
| Integrations | Shopify Admin GraphQL + OAuth + webhooks, 17TRACK, Google Mail / MailerSend, OpenAI (AI descriptions) |
| Time | `moment-timezone`. The whole app is anchored to one operating timezone (default `Australia/Sydney`) |
| Process manager | PM2 (self-hosted; **not** deployed on Vercel) |

## Prerequisites

- **Node.js** 20+ (developed on Node 24) and npm
- **PostgreSQL** 14+ with an empty database (default name: `order_fulfillment`)
- For store connections: a **Shopify app** (client ID and secret) and a public HTTPS URL that
  Shopify can reach for OAuth callbacks and webhooks (for example, a tunnel in development)

## Getting started

```bash
git clone <repo-url> order-fulfillment
cd order-fulfillment
npm install
cp .env.example .env        # then fill in the values — see below
npx prisma migrate dev      # create the schema in your local database
npx prisma db seed          # seed development users (see prisma/seed.ts)
npm run dev                 # http://localhost:3000
```

The dev server only serves the web app. Order and product syncing, the decoration digest, and
background jobs run as **separate worker processes**. Start whichever ones you need in other
terminals (see [Background workers](#background-workers)).

The development login accounts are defined in [`prisma/seed.ts`](prisma/seed.ts). Change their
passwords before you use a seeded database anywhere other than locally.

## Environment variables

Copy `.env.example` to `.env`. `.env*` files are git-ignored, so never commit real secrets.

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `APP_URL` | ✅ | Public base URL of the app (used for OAuth redirects and webhook addresses) |
| `AUTH_URL`, `NEXTAUTH_URL` | ✅ | NextAuth base URL — normally `${APP_URL}` |
| `AUTH_SECRET` | ✅ | NextAuth JWT secret (generate with `openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | ✅ | `true` when running behind a proxy or tunnel |
| `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET` | for stores | Shopify app credentials used by the store connect / OAuth flow |
| `SHOPIFY_APP_URL` | for stores | OAuth entry point — `${APP_URL}/api/shopify-auth` |
| `SHOPIFY_SCOPES` | for stores | Admin API scopes requested on install (see `.env.example` for the full list) |
| `EXTRA_SCOPES` | optional | Extra scopes, e.g. `read_all_orders` |
| `SHOPIFY_APP_NAME` | optional | App name shown in partner-created apps (default `Order Fulfillment`) |
| `SHOPIFY_PARTNER_ACCESS_TOKEN` | optional | Shopify Partner API token for partner-store app creation |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | optional | Google OAuth for outbound email via Gmail (Settings) |
| `OPENAI_API_KEY` | optional | Enables AI product-description generation |
| `AI_PROVIDER`, `AI_MODEL` | optional | AI provider (default `openai`) and model |
| `*_WORKER_POLL_MS` | optional | Poll interval per worker (`ORDER_SYNC_`, `PRODUCT_SYNC_`, `DECORATION_DIGEST_`, `BACKGROUND_`) |
| `*_WORKER_ONCE` | optional | Set to `1` to run a worker once and exit (handy for debugging) |

Some integration settings are stored in the database and edited in the app, not in env vars.
For example, the **17TRACK API key**, the email provider, access windows, and the operating
timezone are all set by an admin under **Settings**.

## Database

The schema lives in [`prisma/schema.prisma`](prisma/schema.prisma) (about 54 models), with
migrations in `prisma/migrations/` and configuration in [`prisma.config.ts`](prisma.config.ts).

```bash
npx prisma migrate dev --name <change>   # create + apply a migration locally
npx prisma generate                      # regenerate the client after schema edits
npx prisma db seed                       # run prisma/seed.ts
npx prisma studio                        # browse data
```

`npm run build` runs `prisma generate && prisma migrate deploy` before `next build`, so
production migrations are applied as part of each build.

Before you change orders or inventory, know these shapes:

- `SupplierProduct` is the hub catalogue record. `SupplierProductStoreListing` holds its publish
  state and margin for each store.
- Stock is **one hub-level pool** that orders draw down through `InventoryAllocation`. Stores do
  not have their own quantities.
- `Order` / `OrderLineItem` are stored per store. Decoration state hangs off line items.
- Fulfilment edits, cancellations, and picking/packing go through **request-and-approval** models
  (`FulfillmentEditRequest`, `DecorationEditRequest`). Don't replace them with direct updates.

## Background workers

Each worker is a standalone, long-running `tsx` process. None of them run inside `next dev` or
`next start`.

| Command | What it does |
|---|---|
| `npm run worker:orders-sync` | Processes queued order-sync jobs (reconciles Shopify orders alongside webhooks) |
| `npm run worker:product-sync` | Processes queued product-sync jobs from connected stores |
| `npm run worker:decoration-digest` | Sends the scheduled end-of-day decoration digest |
| `npm run worker:background` | Job queue for 17TRACK registration and status sync, decoration rescans, and line-item backfills. It also runs the pending-shipment and pickup checks, task reminders, and recurring tasks |

## Shopify integration

- **Connecting a store:** stores are installed through OAuth (`/api/shopify-auth` →
  `/api/shopify-auth-callback`). The callback also registers order and product webhooks.
  Stores can be grouped under a partner-store parent.
- **Inbound:** webhooks arrive at `app/api/webhooks/{orders,products,17track}`, and the sync
  workers also reconcile state on a schedule.
- **Outbound:** handled by `lib/shopify-*.server.ts` (GraphQL client, fulfilment, order
  edit/fetch/sync, product publish/sync, taxonomy, collections, listings).
- **Backfilling webhooks:** if a webhook topic is added after stores are already connected, run
  `npm run register-webhooks` once. It is idempotent, so it skips registrations that already exist.

## Production (PM2)

Production runs under **PM2** on a self-hosted server. [`.pm2.config.js`](.pm2.config.js) defines
the web app (`npm start`, which binds **port 9090**) plus one PM2 process for each worker. Logs
are written to `./logs/`.

```bash
npm ci
npm run build          # prisma generate + migrate deploy + next build
npm run pm2:setup      # first time: install + configure pm2-logrotate, then start everything
npm run pm2:restart    # after later deploys
```

Other PM2 commands: `pm2:start`, `pm2:stop`, `pm2:delete`, and `npm run pm2 -- logs`. Log rotation
keeps 7 days of compressed logs, each up to 10 MB.

## Scripts reference

| Script | Description |
|---|---|
| `npm run dev` | Next.js dev server (Turbopack) on port 3000 |
| `npm run build` | `prisma generate` + `migrate deploy`, then `next build` |
| `npm start` | Production server on port 9090 |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Type check |
| `npm run worker:*` | Background workers (see above) |
| `npm run backfill:order-line-items` | Enqueue a backfill of order line items |
| `npm run backfill:category-full-names` | Backfill full taxonomy names on categories |
| `npm run register-webhooks` | (Re)register Shopify webhooks for every connected store |
| `npm run pm2:*` | PM2 process and log-rotation management |

## Project structure

```
app/
  (shell)/              Authenticated app shell — sidebar + header layout
    orders/ decoration/ picking-list/ back-in-stock/ tasks/ messages/
    tracking/ stores/ inventory/ users/ settings/ profile/
      page.tsx          Thin server component
      modules/          Client orchestrator (index.tsx), page hooks, sub-components
  api/<resource>/       Thin route handlers → controllers
  restricted/ session-expired/   Access-policy landing pages
controllers/            Business logic, validation (<resource>.controller.server.ts)
models/                 Prisma queries only (<resource>.model.server.ts)
lib/                    Server utilities & integrations (Shopify, 17TRACK, email, AI, auth policy…)
hooks/                  Shared client hooks (useRequest, …)
components/             Shared UI (ModalShell, Pagination, Zoom, …)
workers/                Long-running background workers
scripts/                One-off data / maintenance scripts
prisma/                 Schema, migrations, seed
design/                 Design explorations (static mockups, not shipped)
auth.ts                 NextAuth configuration
proxy.ts                Role → allowed route gate
```

## Conventions & quality gates

- **Layering is binding** ([ARCHITECTURE.md](ARCHITECTURE.md)). Route handlers call controllers and return
  `apiSuccess` / `apiError`. Controllers hold the logic and return plain objects. Models are the
  only place Prisma is called. Pages are thin and render `modules/index.tsx`, and client fetching
  goes through `useRequest`.
- **Restricted roles:** when you add a page or API route that a non-admin role needs, add it to
  that role's allow-list in [`proxy.ts`](proxy.ts). Otherwise that role is redirected away from it.
- **UI:** follow [DESIGN.md](DESIGN.md). Inventory uses its own `inventory-*` token skin, and every
  other route uses the gray/blue shell skin.
- **Verification:** there is no test suite. Before you open a PR, run both of these:

```bash
npx tsc --noEmit
```

```bash
npm run lint
```

## Documentation map

| File | What's in it |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Users and roles, product purpose, workflows, terminology, product principles |
| [DESIGN.md](DESIGN.md) | Visual design system — colors, type, layout, components, the two UI skins |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System overview (processes, auth, data model, Shopify), backend/frontend rules, naming, the module decomposition pattern |
| [AGENTS.md](AGENTS.md) | Guidance for AI coding agents: commands, Next.js 16 caveats, product guardrails |
| [INSTRUCTIONS.md](INSTRUCTIONS.md) | Behavioral guidelines for code changes (imported by AGENTS.md) |
| [CLAUDE.md](CLAUDE.md) / [CODEX.md](CODEX.md) | Claude Code / Codex entry points; both import AGENTS.md and ARCHITECTURE.md |
