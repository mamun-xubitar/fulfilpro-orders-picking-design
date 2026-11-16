# Orders + Picking List: merged page, six layout concepts (round 3)

> **Now (round 20): L2 Order Ledger (exact FileMaker positions) is the proposal; L1 and A1 (the current app) stay for comparison.** The original Concept A, the original Concept A1 and B–F are no longer published (the `archive/` folder was deleted in round 20); their renderers stay in `designs*.mjs`, and `CONCEPTS=a1-old,b,c,d,e,f node build.mjs` rebuilds them into the top-level folder. `node build.mjs` builds `l2,l1,a1`. Sections below that mention A, the original A1 or A2 are kept as history (A2 = today's A1, renamed in Round 18).

Design prototype for merging `app/(shell)/orders` and `app/(shell)/picking-list` into one page.
Round 3 changes: the filter now follows the picking slip with a green printed icon (the old 24 h “late” rule is an optional extra), and every gap found against today's pages was closed. See **`PARITY.md`** for the old-vs-new checklist and **`dialogs.html`** for all dialogs, menus and popovers.

Round 4 (Concept A): the **decoration attachments strip** (Files / Customer design / Photo / Customer remarks, Admin) now sits under each row without expanding, the **Customer note** shows in the expanded order as today, and rows are **tinted by status** again (see PARITY.md).

Round 5: the **Shipping block** from today's Orders page (title, Free / Paid, discount codes, Price, Discounted) is back in the expanded order, and **Concept A1** (now the only table concept) re-lays the expanded panel so no column stretches over blank space.

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
| `concept-a1-{admin,staff,picker}.html` | A1 artboards (built by default) |
| `concept-l2-{admin,staff,picker}.html / .png`, `concept-l2-*-full.png` | round 20 L2 artboards, 1512 × 982 (PNGs at 2×); `-full` = first two orders expanded, five collapsed |
| `ledger2.mjs` | L2 renderer: FileMaker position spec, CSS, index notes |
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

Round 11: every role (Admin, Staff, Picker) now opens **two orders** on its A1 artboard so two states can be compared (Admin #2188 fulfilled + #1184 unfulfilled, Staff #0702 + #0718, Picker #2204 slip printed + #4821 slip not printed). The order list scrolls inside its card (`.tscroll`); header, tabs, pager and the floating bulk bar stay fixed.

Round 12 (filters, all three roles): the toolbar of **Admin, Staff** and **Order Picker** now carries the filters of today's pages; the Slip chip is gone. Admin (sees both pages): Store, Period, Status, Packed, Print, Sync, barcode search. Staff: Store, Period, Status (fulfilment), **Packed** (Not Packed, Partial Packed, Packed, Late Unpacked, Shipped Delayed); search has no Barcode field. Picker: **Packed** (opens on Not Packed + Partial Packed, as today) and **Print** (Slip Not Printed / Slip Printed), Clear filters, barcode search; no Store, Period or Sync. Queue tabs are kept next to the filters. Late Unpacked / Shipped Delayed are back in the Packed menu for every role. Menus: `dialogs.html` card 11.

Round 13 (synced to the implemented app, concept A1, all roles): the prototype was brought back in line with the Orders page as it ships on branch `merge-orders-and-picking-page-and-redesign-this-UI` after the 4–5 Nov commits.
- **Item table**: *Deco* is now **Decoration** (EMB / PRT badges only, never wrapped); the *Work* column is replaced by a **Decorator** column (assignee chip or "Unassigned", `+` to assign, **Mark done** and **View** buttons under it, Admin). **Qty** reads `fulfilled/ordered` for Admin and Staff. Lines picked for fulfilment get a blue tint; Staff now see Full / Partial. At 1280 px the table scrolls sideways when Decorator and Full / Partial both show (as in the app; zoom out to see it whole).
- **Queue**: header *Decoration*; Short N sits above the EMB / PRT progress; the Sort chip is a field (Date placed / Order no. / Customer) plus Ascending / Descending; the stage track shows the **Slip dot to Staff too** (read-only).
- **Approvals** (Admin): one collapsible amber section with a count; open it to Approve / Reject (dialogs.html card 15).
- **Fulfilment box**: status badge row (Fulfilled / Partial / Ready to fulfil / Not fully packed + lines still to fulfil); Admin always has Confirm fulfilment + Confirm & Print (disabled once fulfilled); carrier, tracking and edit / cancel live only in the Fulfilments modal.
- **Packing & slip**: every confirmation is listed (scrolls after about two) for every role.
- **Notes and messages**: two panes (compose left, History right), tab renamed **Message**, Send disabled once messaging is closed (Picker: fully packed; Staff: fully fulfilled); the row Message icon is one button and shows disabled in those states.
- **Create PO** from + PO opens Inventory's Create purchase order modal (dialogs.html card 16), prefilled with the shortfall.
- **Filter menus**: size to their content; the custom range shows two larger months.

Round 14 (**Concept A2**, new; A1 and its artboards are untouched): A1 re-laid so the queue and an opened order fit about 1200px (1280px screen, sidebar collapsed) with **no sideways scroll** (`node overflow.mjs concept-a3-*.html` reports no horizontal overflow). Built by `designs3.mjs`, which only imports A1's helpers; `node build.mjs` now builds `a1,a2` (`CONCEPTS=a1` for A1 only).
- **Queue**: Items is a fixed 112px (was the flexible column), Packed 64px, the Notes column is gone (the note icon joins Actions). **Decoration is now Status** and shows the old Orders page's badges, stacked: fulfilment chip (Unfulfilled / Partially Fulfilled / Fulfilled / Closed / Canceled), edit-request flag, Packed / Partial Packed + Label, back-in-stock state, `x/y EMB` `x/y PRT`. The "Short N" badge is removed. Picker keeps Packed date.
- **Row separation**: every order (row, attachments strip, expanded panel) is a group with a 3px left stripe coloured by status (canceled red, closed gray, partial / restock amber, fulfilled blue, packed green, EMB purple, PRT sky) and a 5px gap before the next group.
- **Opened order**: the product name links to Shopify admin (the icon is gone); the SKU is a short mono chip with `…`, full SKU in the tooltip, click copies it ("Copied"). The Decoration column is gone: `1/1 EMB` over `1/1 PRT` sit at the right of the Item cell. Qty and Packed stay as narrow columns. Fulfilment has no section of its own (see Round 15); Packing & slip is **Confirm packed / All N items packed** plus the history. Side columns are 176px (packing, shipping) and 224px (customer).
- PO status / Avail are unchanged (the "stock missing on a hub product created from + PO" point is a functional fix, not part of this design round).

Round 15 (Concept A2 only; A1 untouched):
- **Row icons**: the tax-invoice button uses the app's receipt icon and Order notes the app's note icon (`icons.tsx`), so the two no longer look alike.
- **Packing & slip**: the Print Slip / Reprint Slip button is gone (the row already has the slip icon).
- **No Fulfilment section**: **Confirm fulfilment** and **[printer] & Confirm** sit at the right end of the Order items action bar (after Request stock, Fulfilments, Stock, Add line, tracking). They are disabled once fulfilled, and read "Fulfilment locked" on closed / canceled orders. The bar wraps to a second line if it is too full.
- **Decorator column** is always shown for Admin and Staff, as in the app (Admin: Unassigned + `+`, Mark done, View).
- **Shipping** moved under Packing & slip (middle column); the right column is Customer only.
- **PO status column** is 108px (was 86px): "#1038 Part received" plus its "6/10 in · ETA 2 Nov" line overlapped the Decorator column. Badges in the item rows now also ellipsize instead of spilling into the next column. (`concept-a2` and the shipped app still use 86px.)
- **Qty column** is renamed **Fulfilled** (Admin and Staff, where it reads fulfilled / ordered); Order Picker keeps "Qty". The column is 54px to fit the heading.

Round 16 (Concept A2 only; A1 untouched):
- **Packed and Fulfilment share one column** (Admin, Staff; header "Packed · Fulfilment"): packed count and bar on top, then the first parcel's date and carrier · tracking. Order Picker keeps its single Packed column.
- **Status badges: at most two per line** (a 200px column; each line holds two badges side by side, no empty gap between them), so rows with many badges are about half as tall.

Round 17 (Concept A2 only): the Orders table's column headings sit inside the scroll area (sticky), so they share one width with the rows. Before, the header was outside the scrollbar, which pushed every column right of Customer about 10px left of its heading in the rows. A1 still has that offset. The expanded order is unchanged.

Round 18: **Concept A2 is renamed A1 and is the chosen layout.** The original A1 stays rebuildable as build id `a1-old` (renderer `D.conceptA2` in `designs.mjs`; its archived artboards were deleted in round 20). Rounds 14–17's "Concept A2" is this concept's old name.

Round 19: **Concept L1 · Order Ledger (proposed, for client approval)**, built from the 13 Nov client walkthrough in `client-qa/` (FileMaker "Online Orders Ledger": screenshots, marked controls #0–#18, transcript, video from 26:00). Each order keeps the client's three bands, in the client's own colours (hex values measured from their screenshots, `--fm-*` tokens in `ledger.mjs`):
- **Header line**: what a collapsed order shows. Coloured with the client's legend: Late red, Paid lime, Shipped light blue, Shipped a part dark blue, New white.
- **Lines**: Purchased purple / shipped / part shipped per line.
- **Footer panel**: Production and Pick & Pack lights, Urgent and Repeat, Picking list | P, totals, payment box with the star, Design sent › approved › colours, FulfilPro's fulfilment actions, Marketing + VIP. Peach when the picking list is printed and the order is not packed yet.

Every FulfilPro feature is kept in those bands. Artboards are 1440 × 900 (`concept-l1-{admin,staff,picker}.html / .png`) and interactive. `node build.mjs` now builds `l1,a1`; A1 stays in index.html as the current app, for comparison. index.html lists the colour legend, the client-marker map (kept / merged / removed / new), the role split, the data the build round needs and the questions for the client. Files:
- `ledger.mjs`: page, header line, lines, CSS, interactions.
- `ledger-parts.mjs`: footer, toolbar, popovers, index notes.
- `ledger-data.mjs`: synthetic payment, urgent, design, marketing and per-line fields. `data.mjs` is unchanged.

`W=1440 H=900 node overflow.mjs concept-l1-*.html` checks the new boards.

Round 20: **Concept L2 · Order Ledger, exact FileMaker positions (proposed)**. The client's feedback on L1: "Whatever is in a particular position must remain in that exact position. Everything needs to be similar, and if anything extra is added, it should be added accordingly."
- **Positions:** L2 places every object of the client's order block (header line, line header, line rows, footer) at the x position and width measured from `client-qa/client-old-system.png`, in FileMaker points (block = 1494 pt). Each object is drawn as `left: x/1494`, `width: w/1494` of the order width, so it lines up at any screen width. The spec tables are in `ledger2.mjs`; a headless check confirms every object is within 0.3% of its spec.
- **Look:** text size, spacing, colours and interactions are L1's (shared classes, tokens and `L1_JS`).
- **Freed slots:** controls the client dropped hand their slot to the closest FulfilPro feature:
  - Task/Problem → Messages
  - Take from / In Stock → stock check
  - Pick to do date → Stock out
  - Supplier → Request stock
  - A4 / LABEL | P → Fulfilments and Confirm & print
  - Booking Ship → Confirm fulfilment
- **Added in free space:** Urgent / Repeat / VIP flags, Repeat order (next to Urgent), Names export, VIP (in the Marketing box).
- **Removed:** the ≡ button after the order tick (on request); click the order's top line to open or close it.
- **Roles:** objects a role can't use are hidden and leave their gap.

Artboards are 1512 × 982. `concept-l2-*-full.png` shows two orders expanded and five collapsed. `node build.mjs` builds `l2,l1,a1`. The `archive/` folder was deleted.

`W=1512 H=982 node overflow.mjs concept-l2-*.html` checks the boards.
