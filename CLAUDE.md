# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md
@PATTERN.md
@INSTRUCTIONS.md

## What this app is

FulfilPro — an internal (no self-signup) operations system for a supplier that sells through
multiple partner Shopify stores. It publishes one hub catalogue out to connected stores, pulls
their orders into a single queue, and drives fulfilment: allocate stock, pick, decorate (print /
embroidery / sewing), pack, confirm fulfilment back to Shopify, and track delivery. Seven roles
(`lib/roles.ts`) each see a different subset of the app — see `PRODUCT.md` for the full product
model, roles, and the five product principles (shared stock pool, request-and-approval for
consequential actions, etc.) before touching UX or permissions logic.

## Commands

```bash
npm run dev              # Next.js dev server (Turbopack)
npm run build            # prisma generate + migrate deploy, then next build
npm run lint             # eslint
npx tsc --noEmit         # typecheck (no test suite exists in this repo)
```

Database (Prisma v7, PostgreSQL, `@prisma/adapter-pg`):
```bash
npx prisma migrate dev --name <name>   # create + apply a migration locally
npx prisma generate                    # regenerate client after schema changes
npx prisma studio
```

Background workers (each is a standalone long-running process, not part of `next dev`/`next start`):
```bash
npm run worker:orders-sync
npm run worker:product-sync
npm run worker:decoration-digest
npm run worker:background
```

Production runs under PM2, not Vercel — `npm start` binds port 9090. `.pm2.config.js` defines
the main app plus one PM2 process per worker above; `npm run pm2:start` / `pm2:restart` /
`pm2:stop` drive it.

One-off data scripts (`scripts/`): `npm run backfill:order-line-items`,
`backfill:category-full-names`, `register-webhooks`.

## Architecture

Full backend/frontend conventions (route → controller → model layering, `useRequest` hook usage,
page/module/hook/component decomposition rules, naming conventions) are defined in `PATTERN.md`
and are binding — read it before adding or restructuring any route, controller, model, or page.
The short version:

- `app/api/<resource>/route.ts` — thin handler only; calls a controller and returns
  `apiSuccess`/`apiError` from `lib/api-response.server.ts`. Never calls Prisma directly.
- `controllers/<resource>.controller.server.ts` — business logic, validation, orchestration.
  Returns plain objects (`{ error: { message, errors, status } }` on failure), never a
  `NextResponse`.
- `models/<resource>.model.server.ts` — Prisma queries only, one method per query/transaction.
- `app/<route>/page.tsx` — thin server component that renders `app/<route>/modules/index.tsx`.
- `app/<route>/modules/` — the client orchestrator (`"use client"`) plus that page's own
  sub-components/hooks/utils. Shared logic goes in top-level `hooks/` and `components/` instead.
  When a module grows large, follow the "three-move pattern" in `PATTERN.md` (pure helpers →
  `utils.ts`, state/handlers → composer + domain hooks in `hooks/`, JSX → presentational
  components) rather than inventing a different decomposition.

Auth: NextAuth v5 (`auth.ts`) with a Credentials provider backed by `User.password`
(bcrypt via `lib/password.ts`), JWT sessions. Non-admin roles (`isRestrictedSessionRole` in
`lib/roles.ts`) go through `lib/auth-policy.server.ts` for day/time access windows and an
admin login-approval flow (`StaffLoginApproval`) before a session is issued. `proxy.ts` is the
route-level gate: it maps role → allowed page/API route prefixes (see `STAFF_ALLOWED_*`,
`PICKER_ALLOWED_*`, decorator equivalents) and redirects to `/restricted` or
`/session-expired` — when adding a new route for a restricted role, it must be added to the
matching allow-list here or it will 404/redirect for that role.

Data model: `prisma/schema.prisma` (~54 models). Key shapes to know before touching
orders/inventory:
- `SupplierProduct` is the hub catalogue record; `SupplierProductStoreListing` is its per-store
  publish state/margin; stock is a single hub-level pool drawn down via `InventoryAllocation`
  per order, not a per-store quantity.
- `Order`/`OrderLineItem` are per-store, synced from Shopify by webhook and by the
  `worker:orders-sync` background worker; decoration state hangs off line items
  (`LineItemDecoration`, `LineItemAssignment`, `LineItemWork`).
  Fulfilment edits, cancellations, and picking/packing go through request-and-approval models
  (`FulfillmentEditRequest`, `DecorationEditRequest`) rather than direct mutation — preserve
  that flow when changing these areas rather than short-circuiting to a direct update.

Shopify integration: OAuth-connected stores (`Store`, optionally grouped under a
`partnerStoreId` parent), inbound via `app/api/webhooks/{orders,products,17track}`, outbound via
`lib/shopify-*.server.ts` (graphql client, fulfillment, order edit/fetch/sync, product
sync/publish, taxonomy, store collections/listings, partner). Two sync workers
(`worker:order-sync`, `worker:product-sync`) reconcile state on a schedule in addition to
webhooks.

Timezone: the whole app is anchored to one operating timezone (default `Australia/Sydney`, via
`moment-timezone`), not the viewer's — access windows, task reminders, and the decoration digest
are all evaluated against it (`lib/task-due-date.server.ts`, `lib/decoration-digest.server.ts`,
`lib/auth-policy.server.ts`).

## Notes

- No test framework is configured in this repo; `npx tsc --noEmit` and `npm run lint` are the
  available verification gates.
