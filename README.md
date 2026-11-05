# Orders + Picking List: merged page, six layout concepts (round 3)

> **Decision: Concept A2 (queue table, expanded panel uses the space) is the chosen layout.** The original Concept A was removed; B–F are archived in `archive/` (artboards only; their renderers stay in `designs*.mjs`). `node build.mjs` builds A2 only; `CONCEPTS=a2,b,c,d,e,f node build.mjs` rebuilds it with B–F into the top-level folder. Sections below that mention A or six concepts are kept as history.

Design prototype for merging `app/(shell)/orders` and `app/(shell)/picking-list` into one page.
Round 3 changes: the filter now follows the picking slip with a green printed icon (the old 24 h “late” rule is an optional extra), and every gap found against today's pages was closed. See **`PARITY.md`** for the old-vs-new checklist and **`dialogs.html`** for all dialogs, menus and popovers.

Round 4 (Concept A): the **decoration attachments strip** (Files / Customer design / Photo / Customer remarks, Admin) now sits under each row without expanding, the **Customer note** shows in the expanded order as today, and rows are **tinted by status** again (see PARITY.md).

Round 5: the **Shipping block** from today's Orders page (title, Free / Paid, discount codes, Price, Discounted) is back in the expanded order, and **Concept A2** (now the only table concept) re-lays the expanded panel so no column stretches over blank space.

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
| Print status filter, green printed icon, print picking slip (bin, remark) | ✓ | — | ✓ |
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
| `concept-a2-{admin,staff,picker}.html` | A2 artboards (built by default) |
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

Round 6: the row **Actions** column always shows the tracking button for Admin; it is disabled (greyed, tooltip explains why) when there is no tracking number yet or the parcel is delivered. In **Packing & slip**, Confirm packed and Print Slip / Reprint Slip sit in one row.

Round 7: the **Fulfilments >** button moved from the Fulfilment box to the **Order items** bar (Admin, Staff), like today's order header. It is disabled (tooltip "No fulfilments yet") until the order has a fulfilment confirmation, and opens the fulfilment history as a modal (one card per parcel; Admin edits directly, Staff requests). Click the button in the staff view to try it.

Round 8 (Picker parity, Admin and Staff untouched): the item table gets a **Packed Date** column and the row's empty Deco column becomes **Packed date**; the packing box lists up to 5 confirmations, each cancellable; the customer-note box is gone for Picker, as today's Picking List never shows it to pickers.

Round 9 (Staff only): the expanded order always shows today's **Actions** block (Confirm Fulfilment, Confirm & Print, Print Label, Message with count) inside the Fulfilment box, disabled once the order is fully fulfilled, canceled or closed. The Staff artboard now opens two orders, #0702 (fulfilled, buttons disabled) and #0718 (unfulfilled, buttons enabled), to show both states. Request Stock stays in the Order items bar. The tracking button in the row is unchanged.

Round 10: the pager (select on the left, next to "Showing") now has a **Rows per page** select (10 / 20 / 50 / 100, default 20) on every role, as in today's shared Pagination component; changing it updates the "Showing 1–N" range.

Round 11: every role (Admin, Staff, Picker) now opens **two orders** on its A2 artboard so two states can be compared (Admin #2188 fulfilled + #1184 unfulfilled, Staff #0702 + #0718, Picker #2204 slip printed + #4821 slip not printed). The order list scrolls inside its card (`.tscroll`); header, tabs, pager and the floating bulk bar stay fixed.

Round 12 (filters, all three roles): the toolbar of **Admin, Staff** and **Order Picker** now carries the filters of today's pages; the Slip chip is gone. Admin (sees both pages): Store, Period, Status, Packed, Print, Sync, barcode search. Staff: Store, Period, Status (fulfilment), **Packed** (Not Packed, Partial Packed, Packed, Late Unpacked, Shipped Delayed); search has no Barcode field. Picker: **Packed** (opens on Not Packed + Partial Packed, as today) and **Print** (Slip Not Printed / Slip Printed), Clear filters, barcode search; no Store, Period or Sync. Queue tabs are kept next to the filters. Late Unpacked / Shipped Delayed are back in the Packed menu for every role. Menus: `dialogs.html` card 11.

Round 13 (synced to the implemented app, concept A2, all roles): the prototype was brought back in line with the Orders page as it ships on branch `merge-orders-and-picking-page-and-redesign-this-UI` after the 4–5 Nov commits.
- **Item table**: *Deco* is now **Decoration** (EMB / PRT badges only, never wrapped); the *Work* column is replaced by a **Decorator** column (assignee chip or "Unassigned", `+` to assign, **Mark done** and **View** buttons under it, Admin). **Qty** reads `fulfilled/ordered` for Admin and Staff. Lines picked for fulfilment get a blue tint; Staff now see Full / Partial. At 1280 px the table scrolls sideways when Decorator and Full / Partial both show (as in the app; zoom out to see it whole).
- **Queue**: header *Decoration*; Short N sits above the EMB / PRT progress; the Sort chip is a field (Date placed / Order no. / Customer) plus Ascending / Descending; the stage track shows the **Slip dot to Staff too** (read-only).
- **Approvals** (Admin): one collapsible amber section with a count; open it to Approve / Reject (dialogs.html card 15).
- **Fulfilment box**: status badge row (Fulfilled / Partial / Ready to fulfil / Not fully packed + lines still to fulfil); Admin always has Confirm fulfilment + Confirm & Print (disabled once fulfilled); carrier, tracking and edit / cancel live only in the Fulfilments modal.
- **Packing & slip**: every confirmation is listed (scrolls after about two) for every role.
- **Notes and messages**: two panes (compose left, History right), tab renamed **Message**, Send disabled once messaging is closed (Picker: fully packed; Staff: fully fulfilled); the row Message icon is one button and shows disabled in those states.
- **Create PO** from + PO opens Inventory's Create purchase order modal (dialogs.html card 16), prefilled with the shortfall.
- **Filter menus**: size to their content; the custom range shows two larger months.
