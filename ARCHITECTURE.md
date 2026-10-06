# Architecture

How FulfilPro is put together, and the conventions every change must follow. These rules are
binding: read this before you add or restructure a route, controller, model, or page. For what the
product does and who uses it, see [PRODUCT.md](PRODUCT.md). For the visual system, see
[DESIGN.md](DESIGN.md).

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · PostgreSQL via Prisma 7 with
`@prisma/adapter-pg` (pg connection pool) · NextAuth v5 · Tailwind CSS v4 (`@tailwindcss/postcss`) · lucide-react
icons · react-toastify (one `<ToastContainer position="bottom-right" theme="light" />` in
`app/layout.tsx`) · `moment-timezone`. Self-hosted under PM2, not Vercel.

---

## System overview

### Processes

The web app (`next dev` / `next start` on port 9090) only serves pages and API routes. Four
standalone `tsx` workers in `workers/` run as separate long-lived processes (one PM2 process each,
see `.pm2.config.js`):

- `order-sync.worker.ts` and `product-sync.worker.ts` drain sync job queues
  (`lib/order-sync-jobs.server.ts`, `lib/product-sync-jobs.server.ts`) to reconcile Shopify state
  alongside webhooks.
- `decoration-digest.worker.ts` sends the scheduled end-of-day decoration digest.
- `background.worker.ts` runs the generic job queue (`lib/background-jobs.server.ts`): 17TRACK
  registration and status sync, decoration rescans, line-item backfills, plus pending-shipment and
  pickup checks, task reminders, and recurring tasks.

Each worker reads `<NAME>_WORKER_POLL_MS`, and `<NAME>_WORKER_ONCE=1` makes it run one pass and exit.

### Auth and access control

- `auth.ts` configures NextAuth v5 with a Credentials provider backed by `User.password` (bcrypt via
  `lib/password.ts`) and JWT sessions.
- Seven roles are defined in `lib/roles.ts`. Non-admin roles (`isRestrictedSessionRole`) go through
  `lib/auth-policy.server.ts` for day/time access windows and an admin login-approval flow
  (`StaffLoginApproval`, `lib/staff-login-approval.server.ts`) before a session is issued.
- `proxy.ts` is the route-level gate. It maps each role to allowed page and API route prefixes
  (`STAFF_ALLOWED_*`, `PICKER_ALLOWED_*`, and the decorator equivalents) and redirects to
  `/restricted` or `/session-expired`. **A new page or API route that a restricted role needs must be
  added to that role's allow-list here**, or the role is redirected away from it.
- Finer-grained visibility (which orders, messages, tasks, decorations a user sees) lives in the
  `lib/*-visibility.server.ts` helpers and `lib/store-access.server.ts`.

### Data model

`prisma/schema.prisma` (~54 models). Shapes to know before touching orders or inventory:

- `SupplierProduct` is the hub catalogue record. `SupplierProductStoreListing` holds its publish
  state and margin for each store.
- Stock is owned by the hub, never by a store. Each `SupplierProductVariant` has a `stockOnHand`.
  When the variant has `SupplierProductVariantLocation` rows (quantity per `InventoryLocation`),
  `stockOnHand` is kept equal to the sum of those quantities (`lib/inventory-stock.server.ts`).
  A variant with no location rows holds its stock unassigned.
- Orders draw stock down through `InventoryAllocation` (one row per store order line item, with
  allocated / fulfilled / released / refunded quantities). See `lib/inventory-allocation.server.ts`
  and `lib/inventory-adjustment.server.ts`.
- `Order` / `OrderLineItem` are per store, synced from Shopify by webhook and by the order-sync
  worker. Decoration state hangs off line items (`LineItemDecoration`, `LineItemAssignment`,
  `LineItemWork`).
- Fulfilment edits, cancellations, and picking/packing go through request-and-approval models
  (`FulfillmentEditRequest`, `DecorationEditRequest`). Preserve that flow; don't short-circuit it
  to a direct update.

### Shopify integration

- Stores connect through OAuth (`/api/shopify-auth` → `/api/shopify-auth-callback`), which also
  registers webhooks. A `Store` can be grouped under a partner-store parent (`partnerStoreId`).
- Inbound: `app/api/webhooks/{orders,products,17track}` plus the two sync workers.
- Outbound: `lib/shopify-*.server.ts` (GraphQL client, fulfilment, order edit/fetch/sync, product
  publish/sync, taxonomy, collections, listings, partner).
- `npm run register-webhooks` backfills newly added webhook topics on already-connected stores
  (idempotent).

### Timezone

The whole app is anchored to one operating timezone (default `Australia/Sydney`, configurable in
Settings), not the viewer's. Access windows, task due dates and reminders, and the decoration
digest are all evaluated against it (`lib/auth-policy.server.ts`, `lib/task-due-date.server.ts`,
`lib/decoration-digest.server.ts`).

---

## Directory structure

The real app routes live under `app/(shell)/<route>/` (the authenticated sidebar + header shell).
The generic shape of one resource, using `contacts` as the example:

```
app/
  api/
    contacts/
      route.ts           ← GET list, POST create
      form-data/
        route.ts         ← GET dropdown data
  contacts/
    page.tsx             ← Server component (thin, imports client module)
    modules/
      index.tsx          ← Client orchestrator component
      ContactsTable.tsx
      ContactsFilters.tsx
      AddContactModal.tsx
      ...
  layout.tsx             ← Root layout with ToastContainer
  globals.css

controllers/
  contact.controller.server.ts   ← Class-based controller

models/
  contact.model.server.ts        ← Class-based model (DB access only)

hooks/
  useRequest.ts                  ← HTTP request hook with toast + error handling

lib/
  prisma.server.ts               ← Prisma singleton with pg pool
  utils/
    common.ts

components/                      ← Shared UI components (ModalShell, Pagination, etc.)

prisma/
  schema.prisma
```

---

## Backend pattern

### Route handler (`app/api/<resource>/route.ts`)

- Only responsible for: extracting request data (body, searchParams, params), basic pre-checks,
  calling the controller, and returning the response.
- Never contains business logic or DB calls.
- Use `apiSuccess` / `apiError` from `@/lib/api-response.server`. Never write `NextResponse.json`
  manually.
- **Success response:**
  ```ts
  import { apiSuccess, apiError } from '@/lib/api-response.server';
  return apiSuccess({ message: result.message, data: result.data });              // status 200
  return apiSuccess({ message: result.message, data: result.data, status: 201 }); // creation
  ```
- **Failure response:**
  ```ts
  return apiError({ message: 'Not found', status: 404 });
  return apiError({ message: 'Invalid input', errors: ['email is required'], status: 400 });
  ```
- Use `201` for creation, `200` for reads/updates, `400` for validation, `409` for conflicts, `500`
  for unexpected errors.

### Controller (`controllers/<resource>.controller.server.ts`)

- Named `<Resource>Controller`, exported as a class.
- One method per use case (e.g. `list`, `create`, `update`, `delete`).
- Handles input validation, business rules, calling the model, and transforming results.
- Returns a plain object, never a `NextResponse`.
- On error returns `{ error: { message, errors, status } }`, checked with `'error' in result` in the
  route.
- File suffix: `.server.ts` (never imported by client components).

```ts
export class ContactController {
  async list(searchParams: URLSearchParams) { ... }
  async create(body: unknown) { ... }
}
```

### Model (`models/<resource>.model.server.ts`)

- Named `<Resource>Model`, exported as a class.
- **Only** contains Prisma/DB operations, no business logic.
- Each method maps to one DB query or one `$transaction`.
- File suffix: `.server.ts`.

```ts
export class ContactModel {
  async findMany(params: ContactListParams) { ... }
  async create(data: CreateContactData) { ... }
  async existsByEmail(email: string) { ... }
}
```

---

## Frontend pattern

### Page files (`app/<route>/page.tsx`)

- Server component.
- Thin: it only imports the client module and renders it.

```tsx
import ContactsPage from "./modules";
export default function Page() { return <ContactsPage />; }
```

### Client module (`app/<route>/modules/index.tsx`)

- `"use client"` at the top.
- Orchestrates state, data fetching via `useRequest`, filter/pagination state, and modal open/close.
- Passes data and callbacks down to sub-components as props.
- Debounce search inputs with `setTimeout` (300 ms) before triggering a fetch.

### Sub-components

- `"use client"` only when they use hooks or event handlers.
- Purely presentational where possible: they receive data and callbacks as props.
- No direct API calls from sub-components; all fetching is done in the module index (or its hooks).

### Data fetching with `useRequest`

```ts
const { request, loading, errors } = useRequest();

request({
  url: '/api/contacts',
  method: 'GET',          // default is POST
  showToast: false,       // suppress toast for silent fetches
  data: { page: 1 },      // for GET, appended as query params
  successMessage: 'Done',
  onSuccess: (res) => { /* res.data */ },
  onError: (err) => { /* err.general or field errors */ },
});
```

- `errors` is a `Record<string, string>`: access per field as `errors?.fieldName`.
- `errors.general` holds non-field errors.
- All toast feedback (loading → success/error) is handled automatically by the hook.
- For mutations called on form submit, pass `validation` returning
  `Promise<Record<string, string>>`.

### Skeleton loaders

- Use `loading` from `useRequest` to swap table rows for skeleton rows.
- Skeleton rows mirror the real row structure with `animate-pulse` divs.

### Forms

- Controlled form state with a single `EMPTY_FORM` object and a `set(field)` helper that returns a
  change handler.
- The client-side `validation` callback inside `request()` runs before the network call.
- Server-side errors come through `errors` from `useRequest` and are shown inline below each field.
- Disable the submit button and show `<Loader2 className="animate-spin" />` while
  `loading === true`.

### Pagination

- Page state lives in the module index (`const [page, setPage] = useState(1)`).
- Reset page to 1 whenever filters change.
- Pass the `pagination` object and `onPageChange` down to the table component.

### Function and component size

- Plain functions: **≤ 100 lines**. React component functions: **≤ 160 lines**.
- When a component exceeds 160 lines, extract presentational sub-components and/or custom hooks.
- Keep `index.tsx` a thin orchestrator: state + hook composition + JSX tree only.
- Pull pure request-body/payload assembly into separate helper functions.

### Sub-components and hooks layout

- Page-local pieces (hooks, sub-components) live in the page's own `modules/` folder.
- Logic shared across pages lives in top-level `hooks/` and `components/`.

### Styling

- Use the shared utility classes in `app/globals.css` for common styles, otherwise Tailwind CSS
  utilities.
- Follow [DESIGN.md](DESIGN.md): inventory uses its own `inventory-*` token skin, and every other
  route uses the gray/blue shell skin.

---

## Breaking up a large page module (the three-move pattern)

When a `modules/index.tsx` grows beyond ~300 lines, decompose it in three moves, with **no behavior
change**. `app/(shell)/orders/modules/` is the reference implementation.

### Move 1 — Pure helpers → `utils.ts`

Extract every state-free function (formatters, key builders, derived-value calculators) out of the
component body and into the page's `utils.ts`. This makes them importable by both hooks and
components without circular dependencies.

```
Before: helper defined inside OrdersPage() { ... }
After:  export function rowItemKey(orderId, lineItemId) { ... }  ← utils.ts
```

Rules:
- Signatures stay identical, except that functions which close over state must become pure by
  accepting that state as a parameter (e.g. `getActiveFulfillmentRequest(requests, orderId)`
  instead of reading `orderFulfillmentRequests` from the closure).
- Import from `./utils` in the page folder and from `../utils` in the `hooks/` subfolder.

### Move 2 — State + handlers → `hooks/usePageName.ts`

Move every `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, and handler function into a
single composer hook. The component body becomes: call the hook, render JSX.

```
modules/
  hooks/
    useOrdersPage.ts   ← all state, effects, handlers
  index.tsx            ← calls useOrdersPage(), renders top-level components
```

Rules for the hook:
- **One source of truth per piece of state.** Never duplicate `setOrders`, `setPagination`, etc.
  across hooks; pass them as arguments when a secondary hook needs them.
- **Effect dependency arrays must be byte-identical** to what they were in the component. Don't add
  or remove deps.
- **`useCallback` memoizations must keep their dep arrays** exactly.
- **Preserve timing hacks** (e.g. `setTimeout(() => ref.current?.click(), 100)`) verbatim.
- Return a single grouped bundle object so `index.tsx` can spread props:
  `<OrdersTable {...p.table} />`.

When the hook itself would exceed ~300 lines, split it into domain hooks and compose them inside
`usePageName.ts`.

#### Splitting the composer hook into domain hooks

Each domain hook owns one logical slice of state. The composer receives their output and wires
everything together.

File layout:
```
modules/
  hooks/
    useOrdersPage.ts          ← thin composer (~120–200 lines)
    useOrdersFilters.ts       ← filter state, queryString, pagination
    useOrdersData.ts          ← fetch orders, refresh, expand rows
    useSync.ts                ← sync polling, triggerSync
    useFulfillment.ts         ← confirm fulfillment, line checks
    useFulfillmentRequests.ts ← edit/cancel/permission requests
    useNameAttributes.ts      ← name selection, CSV/print export
    useDecorationWork.ts      ← work modal, file uploads, decoration toggle
    useAssignments.ts         ← decorator assignments
    useOrderMessages.ts       ← admin messages
    useOrderNotes.ts          ← order notes
    useStockRequests.ts       ← back in stock requests
    useStockAdjustment.ts     ← stock adjustment
```

Domain hook shape:
```ts
// Domain hooks receive shared primitives as args — never own duplicated state
export function useFulfillment({
  orders,
  setOrders,
  blockTestModeAction,
}: {
  orders: OrderRow[];
  setOrders: React.Dispatch<React.SetStateAction<OrderRow[]>>;
  blockTestModeAction: () => boolean;
}) {
  // owns ONLY its slice of state
  const [pendingFulfillment, setPendingFulfillment] = useState<...>(null);
  // ...
  return { pendingFulfillment, confirmFul, ... };
}
```

Composer hook shape:
```ts
export function useOrdersPage() {
  const { data: session } = useSession();
  const userIsAdmin = ...;
  const blockTestModeAction = () => { ... };

  // Call domain hooks in dependency order
  const filters = useOrdersFilters();
  const data = useOrdersData({ queryString: filters.queryString, ... });
  const sync = useSync({ blockTestModeAction, setError: data.setError });
  const fulfillment = useFulfillment({ orders: data.orders, setOrders: data.setOrders, blockTestModeAction });
  // ...

  // Compose handlers that span multiple hooks
  const handleRefresh = () => {
    data.bumpRefresh();
    sync.setSyncRefreshNeeded(false);
  };

  return { ...filters, ...data, ...sync, ...fulfillment, handleRefresh, ... };
}
```

Rules for domain hooks:
- Each hook owns the `useState` / `useRef` / `useEffect` for its domain; no duplicated state.
- Shared primitives (`setOrders`, `setPagination`, `blockTestModeAction`, `bumpRefresh`) are passed
  as args.
- **Stable setters** (React `setState` dispatchers) passed as args don't need to be listed in
  `useEffect` dep arrays, because they are guaranteed stable.
- Handlers that span two hooks (e.g. `handleRefresh` touching both data and sync state) belong in
  the composer, not in either domain hook.
- `useCallback` dep arrays stay identical to the original.
- Target: each domain hook ≤ 300 lines; composer ≤ 200 lines.

### Move 3 — JSX tree → presentational components

Split the returned JSX into focused components. Each receives data and callbacks as props and does
no fetching.

```tsx
// index.tsx after the split
const p = useOrdersPage();
return (
  <main>
    <OrdersToolbar {...p.toolbar} />
    <OrdersTable {...p.table} />
    <OrderModals {...p.modals} />
  </main>
);
```

Component shape convention:
```tsx
'use client';  // only if the component uses hooks or browser APIs

type OrdersTableProps = {
  orders: OrderRow[];
  loading: boolean;
  onToggleExpand: (id: string) => void;
  // ...
};

export default function OrdersTable({ orders, loading, onToggleExpand }: OrdersTableProps) {
  // ...
}
```

Rules:
- `className`, `aria-label`, element keys, and every conditional branch must move verbatim, with
  zero text changes inside JSX.
- If extracting a subtree would still exceed 160 lines, extract a further sub-component from within
  it (e.g. `OrderTableRow` → `OrderStatusBadges`, `OrderRowActions`).
- Components that only render JSX from props do **not** need `'use client'` unless they directly
  call hooks or attach event handlers with browser APIs.

### Verification after the split

1. `npx tsc --noEmit`: zero new errors (primary gate).
2. `npm run lint`: zero new lint warnings.
3. Manually smoke-test every interactive slice: expand/collapse, form submission, filters, modals,
   exports.

---

## Naming conventions

| Layer | Convention | Example |
|---|---|---|
| Model file | `<resource>.model.server.ts` | `contact.model.server.ts` |
| Controller file | `<resource>.controller.server.ts` | `contact.controller.server.ts` |
| API route folder | `app/api/<resource>/` | `app/api/contacts/` |
| Prisma enum values | `SCREAMING_SNAKE_CASE` | `ContactStatus.ACTIVE` |
| Component files | `PascalCase.tsx` | `AddContactModal.tsx` |
| Hook files | `camelCase.ts` | `useRequest.ts` |
