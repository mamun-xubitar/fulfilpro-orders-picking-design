# Orders + Picking List: merged page, six layout concepts (round 3)

> **Decision: Concept A (queue table with inline pack) is the chosen layout.** Concepts B–F are archived in `archive/` (artboards only; their renderers stay in `designs*.mjs`). `node build.mjs` now builds A only; `CONCEPTS=a,b,c,d,e,f node build.mjs` rebuilds all six into the top-level folder. Sections below that mention six concepts are kept as history.

Design prototype for merging `app/(shell)/orders` and `app/(shell)/picking-list` into one page.
Round 3 changes: the filter now follows the picking slip with a green printed icon (the old 24 h “late” rule is an optional extra), and every gap found against today's pages was closed. See **`PARITY.md`** for the old-vs-new checklist and **`dialogs.html`** for all dialogs, menus and popovers.

Round 4 (Concept A): the **decoration attachments strip** (Files / Customer design / Photo / Customer remarks, Admin) now sits under each row without expanding, the **Customer note** shows in the expanded order as today, and rows are **tinted by status** again (see PARITY.md).

Open **`index.html`**: it shows every concept, a role switcher (Admin / Staff / Picker) per concept, the role
matrix and the questions for the client. The zoom control works on every artboard (50–150%, Ctrl +/−/0 while the
pointer is over an artboard). Concept F has an Orders / Products toggle; concept D has an extra artboard with the
Create PO popover open.

All orders, customers, suppliers, stock and PO numbers are **synthetic sample data** (`data.mjs`). Nothing here touches the app.
Product thumbnails are drawn garment glyphs standing in for product photos.

## What the client asked for, and where it lands

| Ask | Answer |
|---|---|
| One merged, well-organised page | One route, role-shaped; one stage vocabulary |
| Pickers get packing-list functionality only; admins both | Role matrix below, encoded in `CAP` in `parts.mjs` |
| Fewer clicks for search and filters | Queue tabs with live counts, one smart search, filters as chips |
| Compact, with zoom like Inventory | Inventory density and the same 50–150% zoom trio in the header |
| Product-specific, uses space well | Product tiles, bin, EMB/PRT, stage track, green slip icon, short badges |
| Shopify product redirection | A link icon on each product opens that store's Shopify admin: `https://{storeDomain}/admin/products/{productId}`. Both fields are already on every order line |
| Show product colour | Swatch dot + name on every line, for all roles |
| Purchase order button, PO status, available quantity | Per line: **Avail** (hub on hand − allocated), **PO status** (`#1042 Requested`, `#1038 Part received`, `#1030 Received`, with ETA and received/ordered) and a **+ PO** button on short lines. Orders with uncovered lines carry a **Short N** badge |

## Concepts

| | Idea |
|---|---|
| **A · Queue table + inline pack** | Today's table made faster to read; a row opens in place into items, packing, fulfilment |
| **B · Split queue + inspector** | Compact list, persistent inspector, J / K navigation; large touch targets for pickers |
| **C · Zoned workspace** | Inventory's no-scroll zoned layout in the same gray/blue colours as the rest of the app |
| **D · Order sheet** (recommended) | Every order is a card with its product lines always visible; the next action sits on the order header |
| **E · Today's Orders table, refreshed** | Closest to today: same columns, dropdown filters, selection bar, expanded 3-column row, pagination with page size. Pickers get the Picking List table |
| **F · Orders / Products toggle** | E plus a Products view grouping open order lines by variant (needed, packed, available, PO, bulk Create POs). For pickers: a bin-sorted pick list |

All concepts use the gray/blue shell colours (C was changed from the violet Inventory skin at the user's request).

## Role matrix (unchanged from today, plus the new items)

| Capability | Admin | Staff / Test | Order Picker |
|---|:-:|:-:|:-:|
| Store, Period filters and Sync | ✓ | ✓ | — |
| Fulfilment status, fulfilment column, tracking link | ✓ | ✓ | — |
| Slip-printed filter, green printed icon, print picking slip (bin, remark) | ✓ | — | ✓ |
| Packing: Full / Partial, Confirm packed, notify, cancel confirmation | ✓ | — | ✓ |
| Customer details, labels, tax invoice, name export, new invoice | ✓ | ✓ | — |
| Confirm fulfilment; edit / cancel fulfilment | ✓ / direct | ✓ / request and approval | — |
| Pending-request approvals, stock adjustment, decoration assign, line-item edit | ✓ | — | — |
| Notes, messages, refresh order | ✓ | ✓ | ✓ |
| Request stock, decoration state, name export, label-printed state | ✓ | ✓ | — |
| Decoration assign / mark done, line edit, attachments, tracking actions | ✓ | — | — |
| **Product colour swatch and name** | ✓ | ✓ | ✓ |
| **Product link to Shopify admin** | ✓ | ✓ | — |
| **Available quantity and PO status on each line** | ✓ | ✓ read-only | — |
| **Create purchase order (+ PO)** | ✓ | — | — |

Creating a PO is admin-only today and Staff can read Inventory, so the new items follow that. Pickers have no
Inventory access today, so they get none of the stock, PO or Shopify items.

## Data mapping (for the build round)

| Shown | Source |
|---|---|
| Shopify link | `Store.storeDomain` + `Order.lineItems[].productId` (`models/order.model.server.ts:2076-2094`) |
| Colour | `ProductVariant.optionValues` (Colour/Color); swatch via `resolveSwatch()` in `lib/inventory/colour.ts` |
| Available | `max(0, SupplierProductVariant.stockOnHand − allocated)`; line → hub variant via `findVariantForLine` (`lib/inventory-allocation.server.ts`) |
| PO status / ETA | open `PurchaseOrder` lines, statuses REQUESTED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED; the "incoming" query already exists in `models/supplier-product.model.server.ts` |
| Slip printed | `OrderPickingSlipPrint` rows (first row = printed); filter = existing `printStatus` param (`not_printed` / `printed`) on `/api/picking-list`, to be exposed on the merged page for Admin and Picker only |
| Optional "printed > 24 h, not packed" | existing `lib/late-slip-filter.server.ts` (`late_unpacked`), kept as a secondary option |
| Restock / decoration / name attributes / attachments | `BackInStockRequest`, `LineItemDecoration` + `LineItemAssignment`, line `customAttributes.name`, order decoration files (all as today) |
| + PO | prefilled `POST /api/inventory/purchase-orders` (`supplierId`, `supplierProductId`, `items[{variantId, quantity}]`); created as Requested |

"Short" means available is below the quantity still to pick on the line.

## Decisions worth knowing about

- **Queue tabs.** Admin and Picker pivot on the picking slip: Slip not printed, Slip printed, Packed (Admin adds Shipped, Issues). Staff cannot see slips: Not packed, Partial, Packed, Shipped, Issues.
- **Slip filter and green icon.** Slip: Any / Not printed / Printed (Admin, Picker only). The print icon turns green with a tick once the slip is printed. The old Late Unpacked / Shipped Delayed rule (slip printed over 24 h ago) is gone as a badge, tab or KPI; it survives as one optional line in the Slip menu. Built for the **picking slip**; the shipping label has its own green "Label printed" state.
- **Pick route by bin** (Picker views in A, B, C) is new and optional.
- **Packed state.** When every line is packed, "Confirm packed" turns into a quiet "All N items packed" so "Confirm fulfilment" is the single primary action.
- **Density is deliberate.** Text is 9.5–12px, matching Inventory; the zoom control is the mitigation.
- Reviewed twice by the impeccable finish reviewer; material fixes applied after each round.

## Questions for the client

1. Barcode search for Staff? Today only the Picking List has it.
2. A separate "Picked" stage, or keep it implied by printing the slip?
3. Keep the optional "printed over 24 h ago, not packed" line in the Slip menu, or drop it?
3b. Is "Print packing slip" the picking slip (Picking List) or the shipping label (Orders)?
3c. Request Stock (free-text supplier) and Purchase Orders overlap: keep both, or move Request Stock onto POs later?
4. Keep `/orders` for everyone, or a new route with redirects from both old pages?
5. Should pickers see a simple "short, on PO" hint? (Left out: no Inventory access today.)
6. Should + PO prefill the shortfall (shown) or the supplier's usual reorder quantity?
7. Should the product link also offer the storefront page, or is Shopify admin enough?

## Files

| File | Role |
|---|---|
| `index.html` | contact sheet: all concepts and roles |
| `dialogs.html` | round 3: every dialog, menu and popover of today's pages, shared by all concepts |
| `PARITY.md` | round 3: old-system capability checklist (covered / added / changed) |
| `extras.mjs`, `dialogs.mjs` | round 3 renderers: decoration, restock, name attributes, attachments, label state; the dialogs sheet |
| `concept-{a..f}-{admin,staff,picker}.html / .png` | 18 artboards, 1280 × 800, PNGs at 2× |
| `concept-d-admin-po.html / .png` | Create PO popover |
| `data.mjs` | sample orders, stock, POs, restock, decoration and derived state |
| `parts.mjs` | role capabilities (`CAP`) and shared widgets |
| `designs.mjs`, `designs2.mjs` | concepts A–C and D–F |
| `styles.mjs`, `chrome.mjs`, `chrome-base.mjs` | CSS, icons, garment tiles, header, zoom |
| `build.mjs`, `shot.sh`, `overflow.mjs`, `measure.mjs` | build, screenshots, checks |

```bash
node build.mjs
./shot.sh concept-d-admin.html out.png 1280 800 2
node overflow.mjs concept-d-admin.html
```
