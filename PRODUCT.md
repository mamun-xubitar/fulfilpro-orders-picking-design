# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

All users are internal to the supplier operation — staff, not customers. Every account is
created by an admin; there is no self-signup. Seven roles, defined in `lib/roles.ts`:

- **Admin** — full access, including Stores, Inventory, Users, and Settings. The only role
  that can connect stores, publish catalogue products, and change operating configuration.
- **Staff** — day-to-day order and fulfilment work; blocked from the admin-only sections.
- **Test User** — a staff-like account whose destructive actions are blocked at the UI layer
  ("test mode") so the app can be demonstrated or trialled against live data.
- **Order Picker** — sees only the Pick & Pack view of the Orders page (packing and picking-slip
  printing, without customer, fulfilment or stock data), Tasks, and Messages.
- **Decorator — Print / Emb / Sewer** — sees the Decoration queue for their own discipline.
  Print and Emb are auto-scoped by category keyword; Sewer sees only work explicitly assigned
  to them. Cross-visibility between print and embroidery is an admin-toggled setting.

Staff, picker, and decorator accounts are additionally constrained by day-of-week and
time-of-day access windows, per-store access lists, session and inactivity timeouts, and an
admin login-approval step.

## Product Purpose

FulfilPro is the operations system for a supplier that sells through other people's Shopify
storefronts. It publishes the supplier's catalogue out to connected partner stores, pulls the
resulting orders back into one queue, and drives the whole physical path from order to
despatch: allocate stock, pick, decorate (print, embroidery, sewing), pack, confirm
fulfilment back to Shopify, and track the parcel to delivery.

Success is that every order across every connected store moves through the floor without
anyone needing to open a Shopify admin, and that stock, decoration state, and tracking stay
truthful across all of them at once.

## Positioning

The product sits between a supplier's catalogue and many independent retailers' Shopify
stores, and treats that as one operation rather than N separate ones:

- One hub catalogue (`SupplierProduct`) is published to many stores, each with its own
  per-store margin and its own Shopify product record and status.
- Stock is a single hub-level pool with explicit per-order allocations
  (`InventoryAllocation`), so an order placed on any connected store draws down the same
  inventory the other stores are selling from.
- Decoration is treated as a first-class production stage with its own queue, disciplines,
  assignments, artwork files, and edit-request approval trail — not as an order note.

## Operating Context

Timezone-anchored operation (default `Australia/Sydney`); access windows, digests, and task
reminders are all evaluated against that timezone rather than the viewer's.

Connected stores are Shopify stores installed via OAuth, optionally grouped under a
partner-store parent. Orders and products arrive by webhook and by background sync workers
(`worker:orders-sync`, `worker:product-sync`, `worker:background`,
`worker:decoration-digest`) run under PM2 alongside the Next.js server.

The main workflows, one per shell route:

- **Orders** — the cross-store order queue: line items, decoration state, name/number
  attributes, notes, admin messages, stock adjustments, packing confirmation, and fulfilment
  confirmation back to Shopify. One page serves every role, shaped by role: Admin sees
  everything, Staff sees fulfilment (no picking slips or packing), and Order Pickers see only
  packing and picking-slip printing. Each line shows its colour, a link to the product in Shopify
  admin, available hub stock and purchase-order status, and Admin can raise a purchase order
  from it (adding the product to the hub under the line's store first if it is missing). Certain actions (fulfilment edits, cancellation, picking and
  packing) run through a request-and-approval flow rather than being taken directly.
- **Decoration** — the production queue for print, embroidery, and sewing: per-line-item
  decoration records, decorator assignments, work logging, artwork attachments, edit requests,
  and a scheduled end-of-day digest.
- **Back In Stock** — staff raise a request against an order's short items; admins respond in
  a threaded exchange.
- **Tasks** — assigned and recurring work with due types (standard / urgent / custom),
  reminder times, and per-user visibility rules.
- **Messages** — internal conversations and direct messages, gated by admin-configured
  allow-lists.
- **Tracking** — shipment tracking via 17TRACK, with carrier detection, bulk registration,
  webhook status updates, pending-shipment alerts, and pickup reminders.
- **Stores** — connect and manage Shopify stores and partner-store groupings.
- **Inventory** — the hub catalogue: suppliers, supplier products and variants, pricing and
  margin, purchase orders, stocktakes, stock adjustments, an activity log, and per-store
  listing/publish state.
- **Users / Settings / Profile** — accounts, roles, access windows, and the operating
  configuration that the workflows above read from.

## Capabilities and Constraints

- Next.js 16 App Router with Turbopack, React 19, TypeScript strict, Tailwind CSS v4,
  PostgreSQL via Prisma 7. Architecture rules live in `ARCHITECTURE.md` and are binding.
- Route handlers stay thin; business logic lives in `controllers/`, all DB access in
  `models/`. Client data fetching goes through the `useRequest` hook, with toast feedback.
- Self-hosted, run under PM2 (`npm start` on port 9090) — not a Vercel deployment.
- Auth is NextAuth v5 with credentials, plus a device-code flow and a Google integration for
  outbound email (MailerSend is the alternate provider).
- The orders and decoration pages carry deliberate copy-protection (`user-select: none`,
  `[data-protected]`) for non-admin roles. This is a product decision, not a styling accident.
- Money is stored as `Decimal`; a global margin percent, global exchange rate, and stored
  currency rates apply across the catalogue.
- Terminology to keep consistent: **hub catalogue** / **supplier product** (the master
  record), **listing** (its presence on one store), **partner store**, **allocation**,
  **decoration** (never "customisation"), **fulfilment request**, **picking slip**.

## Brand Commitments

None pinned. The product currently ships as **FulfilPro** ("Fulfilment Management System"),
with a blue-on-grey Tailwind default look and a system sans stack — but the user has not made
the name, the palette, or the current appearance binding. Treat all of it as the incumbent
implementation, not as a constraint.

There is no logo asset in the repository; `public/uploaded/logos/` holds merchant-uploaded
store logos, not FulfilPro's own identity.

## Evidence on Hand

- Real domain surface to design against: 15 shell routes and ~45 Prisma models, all
  implemented.
- `public/install-step/step-img-1..6.png` — real screenshots of the Shopify app install flow.
- No customer testimonials, case studies, press, usage metrics, pricing, or logos exist. Do
  not fabricate any of them; this is an internal tool with no marketing surface today.

## Product Principles

1. **One operation, many storefronts.** Anything that shows an order, a product, or stock
   must make the store it belongs to unambiguous, and must never imply that per-store data is
   independent when it draws on a shared pool.
2. **The floor is the user.** Picker and decorator views are used at a desk *and* on a
   shop-floor tablet, standing, mid-task. Touch targets, glanceability, and one-handed
   reachability are requirements for those surfaces, not enhancements.
3. **Role defines the world.** Each role sees a genuinely different app. Design each role's
   view as complete in itself rather than as the admin view with items removed.
4. **State must be legible at a glance.** Allocation, decoration, packing, fulfilment, and
   tracking are separate states that advance independently; a row has to show where an order
   actually is without being opened.
5. **Consequential actions are requests, not clicks.** Fulfilment edits, cancellations,
   picking/packing, and stock adjustments route through approval. The interface should make
   the approval trail visible rather than hiding it behind a confirm dialog.

## Accessibility & Inclusion

No product-specific standard was established. The shop-floor tablet context (principle 2)
implies practical minimums — adequate touch targets and contrast readable under warehouse
lighting — but no formal conformance target has been set.
