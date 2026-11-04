# Parity check: current Orders + Picking List vs the merged prototype

> **Decision:** Concept A2 is chosen (the original A was removed); B–F are archived in `archive/`. Rows below that name other concepts (B–F) are history.

Source of truth: the stable code on branch `merge-orders-and-picking-page-and-redesign-this-UI`
(`app/(shell)/orders/modules`, `app/(shell)/picking-list/modules`, `proxy.ts`, `lib/roles.ts`,
`lib/late-slip-filter.server.ts`). Checked in round 3 against the round-2 prototype.

Legend: **Covered** = was already in the prototype. **Added** = missing in round 2, added in round 3.
**Changed** = deliberately different (reason given). **Note** = a rule, not a screen.

"Where" says how each of the six concepts (A–F) carries it. Dialogs, menus and popovers are drawn once in
[`dialogs.html`](dialogs.html) (numbers in brackets) and shared by all six.

## Filter change requested in round 3

| Was | Now |
|---|---|
| Packing filter options Late Unpacked / Shipped Delayed: slip printed over 24 h ago and not packed (or packed, not shipped). Slip Printed / Not Printed was a second, separate filter. | **Slip filter is the primary pivot** (Admin, Picker): Any · Not printed · Printed. Queue tabs are *Slip not printed · Slip printed · Packed* (+ Shipped, Issues for Admin). |
| Print slip icon turned green but was a small detail | Green icon with a tick after printing: on the row, in the pack box ("Slip printed · Reprint"), in the stage track and in Products view. Not printed stays neutral. |
| Red Late / Unshipped badges, Late tab, Late KPI | Removed. The old rule survives only as an optional line in the Slip menu: "Printed over 24 h ago, not packed" ([11]). |
| Staff | Unchanged: Staff cannot see slips (today `/api/picking-list` is Admin and Picker only). |
| **Round 12 (all roles)** | Every toolbar now uses **today's filters**, not the Slip chip: Admin = Store, Period, Status, Packed, Print, Sync; Staff = Store, Period, Status, **Packed**; Picker = **Packed** (opens on Not Packed + Partial Packed), **Print** (Slip Not Printed / Slip Printed), Clear filters. Packed has all five options again, including Late Unpacked and Shipped Delayed. Queue tabs stay. Menus in `dialogs.html` [11]. |

Open: the brief says "Print packing slip". The app has **Print picking slip** (Picking List, `OrderPickingSlipPrint`) and
**Print Label** (Orders, `Order.labelPrintedAt`, the 4×6 shipping label). Built for the picking slip; the label already
has its own green state ("Label printed"). Confirm with the client.

## Orders page

| Capability today | Status | Where |
|---|---|---|
| Search by order / customer / address / product, field picker | Covered | all, search box with field chip |
| Barcode search (Picking List only) | Covered | scan icon; Picker view |
| Store multi-select | Covered / Added menu | chip; menu [11] |
| Period incl. custom range calendar | Added | chip; calendar [11] |
| Fulfilment status filter (Unfulfilled, Partial, Fulfilled, Closed, Canceled) | Added | chip; menu [11] |
| Packing status filter | Restored (all roles) | Round 12: every role gets today's Packed dropdown with all five options (incl. Late Unpacked, Shipped Delayed) next to the queue tabs |
| Sort Order No. / Customer / Ordered at | Covered | A, E, F column headers; B, D sort chip |
| Clear filters, active filter chips | Covered | all |
| Sync split button (store picker), sync message | Covered / Added menu | toolbar; menu [11] |
| Refresh turns amber after a sync | Added | toolbar (A and D Admin boards show it) |
| Selection bar: select page, select all matching filters, N selected, Clear | Covered / Added | E, F selection bar; others use the floating bulk bar |
| Print labels (N), + New invoice, Expand all | Covered | Print labels in the bulk bar; + New invoice and Expand all in the queue header (Expand all replaces the bulk Expand) |
| Name attributes: per-line "Name:" chip with tick, export CSV / Print | Added | line chip, `Export names (n) ▾` (same label in the bulk bar, the expanded order and the dialog; today's button reads "Export attributes (n)"); menu + CSV [9] |
| Table columns (order, store, customer, date, status, stock adjustment, items, fulfilment, note, actions) | Covered | Concept A has a Store column (all roles), Stock adj. (Admin) and Fulfilment (Admin, Staff: date, carrier, tracking no., `+N` for more parcels); status is the stage track |
| Row tint rules (back-in-stock amber, decoration purple/sky, status colours) | Restored | Row (and its strip) is tinted by status: canceled red, closed gray, pending request / partial fulfilment amber, fulfilled blue, **packed green (new)**, back-in-stock light amber, otherwise EMB purple / PRT sky. Slip state stays on the green printer icon. `rowTone()` in `parts.mjs` |
| Customer note (`Order.note`) | Added | Only inside the expanded order, as today: Admin / Staff get a "Note" box under the fulfilment box (Orders page). Pickers get none (see the Corrected row below). Not the internal order notes in the Notes column |
| Attachments row (Files, Customer design, Photo, Customer remarks) | Changed | Now always visible under every EMB / PRT row for Admin, without expanding, with "Add files" per field and the remarks input, as today. `underRow()` in `extras.mjs` |
| Order No. green once the label is printed; Label printed chip | Added | green order number, tag chip (all concepts) |
| Closed status (distinct from Canceled) | Added | "Closed" badge on the row, Issues queue; locked fulfilment box [13] |
| Fulfilment status chip, Packed / Partial Packed chip | Covered | stage track |
| Back-in-stock chip (Need restock / Partly restocked / Restocked) | Added | order chip, line chip `Restock 0/5` |
| Decoration chips `x/y Emb`, `x/y Print` with assignee | Added | A–F row / expanded order |
| Stock Adjustment column + modal (Admin) | Restored as a column | `Stock adj.` column, green / amber / red `managed/total` pill (Concept A); the expanded order keeps the `Stock m/t` button; modal [4] |
| Notes count + modal, admin messages count + modal | Covered / Added modal | note icon in the Notes column, message icon in the Actions column (as today); modal [12] |
| Tracking icon states, register / pause / restart (Admin) | Added | tracking icon in the row Actions (Admin, orders with a tracking number), also in the order bar; modal [10], states [13] |
| View details expand, Refresh order, Tax invoice, Label | Covered | row action icons (tax invoice and label for Admin/Staff); no longer repeated in the expanded customer box |
| Expanded: customer name, full address (street, city, state, zip, country), shipping lines (Free/Paid, discount codes, Price, Discounted) | Added | customer box plus a Shipping block (`shipBox()` in `parts.mjs`), same fields as today. Email and phone are order fields that **today's pages do not display**; shown here for **Admin only** (`CAP.contact`) as a proposal, easy to remove |
| Product table: Product, SKU, Emb, Print, QTY, Packed, Restock, Work, Full, Partial | Covered / Added | lines grid in Concept A: **SKU** column and **Work** `done/qty` pill (green / amber / grey) are columns again; Emb and Print share one **Deco** column (progress and Assign); Restock stays a chip under the name (columns tightened so Admin still fits beside the Packing and Fulfilment boxes) |
| Line edit / delete / add (Admin), custom item, restock on delete | Added | per-line **Actions** column (edit, delete; locked when closed / canceled or fulfilled, as today) plus the header `Add line`; modals [8] |
| Decoration: toggle, Assign, Mark done, View decorations, Work badge | Added | Deco column `+ Assign`; modals [7] |
| Attachments row (Files, Customer design, Photos, remarks) | Added | strip under the lines (Admin, decorated orders) |
| Request Stock modal | Added | `Request stock` button with count; modal [3], cross-linked to PO status |
| Confirm fulfilment: barcodes, carrier search, tracking number and URL, notify, Confirm & print | Added | opens from **Confirm fulfilment** / **Confirm & Print** as a modal, as today; not inline in the fulfil box; modal [5] |
| Expanded **Actions** block: Confirm Fulfilment, Confirm & Print (sky), Print Label, Message (count) | Added (round 9, Staff) | Always shown in the Fulfilment box for Staff, disabled once fully fulfilled (all four), canceled or closed ("Fulfilment locked"), as today's `OrderActionsColumn`. `actionsBox()` in `parts.mjs`; Admin keeps the inline buttons for unfulfilled orders |
| Fulfilments view (several parcels, barcodes, lines) | Added | `Fulfilments >` button in the **Order items** bar (Admin, Staff), next to Request stock, as in today's order header; disabled until the order has a fulfilment confirmation; opens the history as a modal [6] |
| Edit / cancel fulfilment: Admin direct, Staff request → pending → "Edit now" | Covered / Added states | fulfil box; [6] |
| "Fulfilment locked" for canceled and closed | Added | fulfil box [13] |
| Pending requests panel (Admin) | Covered | approvals strip |
| Test user: mutations blocked | Note | [14] |
| Copy protection for non-Admin | Note | [14], role matrix |
| Pagination, page size | Covered | pager (page-size selector in D, E, F) |

## Picking List

| Capability today | Status | Where |
|---|---|---|
| Default filter Not packed + Partial; Clear resets to the default | Note | picker queue tabs open on Slip not printed / printed; E and F keep the chip `Not packed + Partial` |
| Hidden: fulfilled orders, lines already fulfilled, orders before 1 May 2026 | Note | picker pool excludes Shipped / Issues; build round keeps the cutoff |
| Store, Period, Sync hidden for Picker | Covered | role-shaped toolbar |
| Slip printed / not printed filter | Changed (primary) | see above |
| Columns: Order, Store, Customer, Packed qty, Packed date, Note. Picker: no Store / Period filter, no customer details in the expanded row | Covered | packed qty bar; **Packed date** column in the row (Picker only, takes the place of Deco) and a **Packed Date** column in the item table (round 8) |
| Status chips Packed / Partial / Pending, Fulfilled (Admin) | Covered | stage track |
| Print picking slip per order and in bulk; green once printed; disabled when packed | Covered / strengthened | green icon with tick |
| Print modal: per-line qty, Remove / Restore, Location + Remark rows, note | Added | modal [1] |
| A4 slip layout (one page per order, write-in boxes) | Added | paper preview [1] |
| Confirm packed: Full / Partial per line | Covered | lines grid |
| Notify: list of users (name + email, all ticked by default), optional email message; cancel packed | Added | opens from **Confirm packed** as a modal, as today (users with emails, optional message); not shown inline in the pack box. Modal [2]. Round 3 first showed only two generic labels; corrected after client feedback. Reference screenshots of today's modal: `current-system/` (local only, contains real addresses) |
| Packing history (up to 5, each cancellable) | Covered (Picker) / Changed (Admin) | Picker lists every confirmation (up to 5), each with its own cancel icon, as today. Admin keeps the latest entry inline |
| Customer note (`Order.note`) | Corrected | Pickers do **not** see it today (it sits in the Picking List's customer section, which pickers never get). Round 3 wrongly showed an amber box for Picker; removed in round 8. Admin / Staff keep the "Note" box |
| Messages to admin (`type=picker`), notes | Covered / Added modal | thread; modal [12] |
| Per-order Refresh | Covered | refresh icon |

## New in this project (from the brief)

Product colour swatch, Shopify admin link (Admin, Staff), Available quantity, PO status with ETA, `+ PO` (Admin),
zoom 50–150%, role-restricted visibility, bin route for Pickers: unchanged from round 2 (see README).

## Out of scope

Decorator roles (`decorator_print`, `decorator_emb`, `decorator_sewer`) stay on `/decoration`; copy of the
Orders components there is unchanged.

## Not changed on purpose

The request-and-approval flows (`FulfillmentEditRequest`, `DecorationEditRequest`) are kept for Staff; nothing in
the prototype replaces them with a direct edit.
