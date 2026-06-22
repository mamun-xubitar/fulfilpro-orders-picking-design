# App Architecture Pattern

## Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict)
- **Database**: PostgreSQL via Prisma v7
- **ORM**: Prisma with `@prisma/adapter-pg` (connection pool)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Icons**: lucide-react
- **Toasts**: react-toastify (`<ToastContainer position="bottom-right" theme="light" />` in `app/layout.tsx`)

---

## Directory Structure

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

components/                      ← Shared UI components (PageLayout, Modal, etc.)

prisma/
  schema.prisma
```

---

## Backend Pattern

### Route Handler (`app/api/<resource>/route.ts`)
- Only responsible for: extracting request data (body, searchParams, params), basic pre-checks, calling the controller, and returning `NextResponse`.
- Never contains business logic or DB calls.
- Use `apiSuccess` / `apiError` from `@/lib/api-response.server` — never write `NextResponse.json` manually.
- **Success response**:
  ```ts
  import { apiSuccess, apiError } from '@/lib/api-response.server';
  return apiSuccess({ message: result.message, data: result.data });          // status 200
  return apiSuccess({ message: result.message, data: result.data, status: 201 }); // creation
  ```
- **Failure response**:
  ```ts
  return apiError({ message: 'Not found', status: 404 });
  return apiError({ message: 'Invalid input', errors: ['email is required'], status: 400 });
  ```
- Use `201` for creation, `200` for reads/updates, `400` for validation, `409` for conflicts, `500` for unexpected errors.

### Controller (`controllers/<resource>.controller.server.ts`)
- Named `<Resource>Controller`, exported as a class.
- One method per use-case (e.g., `list`, `create`, `update`, `delete`).
- Handles: input validation, business rules, calling the model, transforming results.
- Returns a plain object — never a `NextResponse`.
- On error returns `{ error: { message, errors, status } }`, checked with `'error' in result` in the route.
- File suffix: `.server.ts` (never imported by client components).

```ts
export class ContactController {
  async list(searchParams: URLSearchParams) { ... }
  async create(body: unknown) { ... }
}
```

### Model (`models/<resource>.model.server.ts`)
- Named `<Resource>Model`, exported as a class.
- **Only** contains Prisma/DB operations — no business logic.
- Each method maps to one DB query or a `$transaction`.
- File suffix: `.server.ts`.

```ts
export class ContactModel {
  async findMany(params: ContactListParams) { ... }
  async create(data: CreateContactData) { ... }
  async existsByEmail(email: string) { ... }
}
```

---

## Frontend Pattern

### Page files (`app/<route>/page.tsx`)
- Server component.
- Thin — only imports the client module and renders it.

```tsx
import ContactsPage from "./modules";
export default function Page() { return <ContactsPage />; }
```

### Client module (`app/<route>/modules/index.tsx`)
- `"use client"` at top.
- Orchestrates: state, data fetching via `useRequest`, filter/pagination state, modal open/close.
- Passes data and callbacks down to sub-components as props.
- Debounce search inputs with `setTimeout` (300ms) before triggering fetch.

### Sub-components
- `"use client"` only when they use hooks or event handlers.
- Purely presentational where possible — receive data and callbacks as props.
- No direct API calls from sub-components; all fetching is done in the module index.

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
- `errors` is a `Record<string, string>` — access per-field as `errors?.fieldName`.
- `errors.general` for non-field errors.
- All toast feedback (loading → success/error) is handled automatically by the hook.
- For mutations called on form submit, pass `validation` returning `Promise<Record<string, string>>`.

### Skeleton loaders
- Use `loading` from `useRequest` to swap table rows for skeleton rows.
- Skeleton rows mirror the real row structure with `animate-pulse` divs.

### Forms
- Controlled form state with a single `EMPTY_FORM` object and a `set(field)` helper returning a change handler.
- Client-side `validation` callback inside `request()` runs before network call.
- Server-side errors surfaced via `errors` from `useRequest`, shown inline below each field.
- Disable submit button and show `<Loader2 animate-spin />` while `loading === true`.

### Pagination
- Page state lives in the module index (`const [page, setPage] = useState(1)`).
- Reset page to 1 whenever filters change.
- Pass `pagination` object and `onPageChange` down to the table component.

### Function & Component Size
- Plain functions: **≤ 100 lines**. React component functions: **≤ 160 lines**.
- When a component exceeds 160 lines, extract presentational sub-components and/or custom hooks.
- Keep `index.tsx` a thin orchestrator: state + hook composition + JSX tree only.
- Pull pure request-body/payload assembly into separate helper functions.

### Sub-components & hooks layout
- Page-local pieces (hooks, sub-components) live in the page's own `modules/` folder.
- Logic shared across pages lives in top-level `hooks/` and `components/`.

### Breaking up a large page module (the three-move pattern)

When a `modules/index.tsx` grows beyond ~300 lines, decompose it in three moves — **no behavior change**:

#### Move 1 — Pure helpers → `utils.ts`
Extract every state-free function (formatters, key builders, derived value calculators) out of the component body and into the page's `utils.ts`. This makes them importable by both hooks and components without circular deps.

```
Before: helper defined inside OrdersPage() { ... }
After:  export function rowItemKey(orderId, lineItemId) { ... }  ← utils.ts
```

Rules:
- Signatures stay identical, except functions that close over state must become pure by accepting that state as a parameter (e.g. `getActiveFulfillmentRequest(requests, orderId)` instead of reading `orderFulfillmentRequests` from closure).
- Import from `./utils` in the page folder; from `../utils` in the `hooks/` subfolder.

#### Move 2 — State + handlers → `hooks/usePageName.ts`
Move all `useState`, `useRef`, `useEffect`, `useMemo`, `useCallback`, and every handler function into a single composer hook. The component body becomes: call the hook, render JSX.

```
modules/
  hooks/
    useOrdersPage.ts   ← all state, effects, handlers
  index.tsx            ← calls useOrdersPage(), renders top-level components
```

Rules for the hook:
- **One source of truth per piece of state** — never duplicate `setOrders`, `setPagination`, etc. across hooks. Pass them as arguments when a secondary hook needs them.
- **Effect dependency arrays must be byte-identical** to what they were in the component — do not add or remove deps.
- **`useCallback` memoizations must preserve their dep arrays** exactly.
- **Preserve timing hacks** (e.g. `setTimeout(() => ref.current?.click(), 100)`) verbatim.
- Return a single grouped bundle object so `index.tsx` can spread props: `<OrdersTable {...p.table} />`.

When the hook itself would exceed ~400 lines, split into domain hooks (`useOrdersFilters`, `useOrdersData`, `useFulfillment`, etc.) and compose them inside `usePageName.ts`. Share primitives by passing them as arguments — never duplicate state.

#### Move 3 — JSX tree → presentational components
Split the return JSX into focused components. Each receives data and callbacks as props; no fetching inside.

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
- `className`, `aria-label`, element keys, and every conditional branch must move verbatim — zero text changes inside JSX.
- If extracting a subtree would still exceed 160 lines, extract a further sub-component from within it (e.g. `OrderTableRow` → `OrderStatusBadges`, `OrderRowActions`).
- Components that only render JSX from props do **not** need `'use client'` unless they directly call hooks or attach event handlers with browser APIs.

#### Verification after the split
1. `npx tsc --noEmit` — zero new errors (primary gate).
2. `npm run lint` — zero new lint warnings.
3. Manual smoke of every interactive slice: expand/collapse, form submission, filters, modals, exports.

---

## CSS Utility Classes (`app/globals.css`)

Use utility classes for common styles or common styles with tainwinds css

---

## Naming Conventions

| Layer | Convention | Example |
|---|---|---|
| Model file | `<resource>.model.server.ts` | `contact.model.server.ts` |
| Controller file | `<resource>.controller.server.ts` | `contact.controller.server.ts` |
| API route folder | `app/api/<resource>/` | `app/api/contacts/` |
| Prisma enum values | `SCREAMING_SNAKE_CASE` | `ContactStatus.ACTIVE` |
| Component files | `PascalCase.tsx` | `AddContactModal.tsx` |
| Hook files | `camelCase.ts` | `useRequest.ts` |
