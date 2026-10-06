---
name: FulfilPro
description: Fulfilment management system — one dense, status-first operations floor over many partner Shopify stores.
colors:
  # Shell skin — every route except Inventory (Tailwind default palette, used directly as utilities)
  shell-primary: "#2563eb"
  shell-primary-hover: "#1d4ed8"
  shell-primary-soft: "#eff6ff"
  shell-focus-ring: "#3b82f6"
  shell-sidebar: "#111827"
  shell-sidebar-hover: "#374151"
  shell-sidebar-ink: "#d1d5db"
  shell-brand-mark: "#60a5fa"
  shell-surface: "#ffffff"
  shell-surface-muted: "#f9fafb"
  shell-surface-sunken: "#f3f4f6"
  shell-border: "#e5e7eb"
  shell-border-input: "#d1d5db"
  shell-ink: "#111827"
  shell-ink-body: "#374151"
  shell-ink-secondary: "#4b5563"
  shell-ink-muted: "#6b7280"
  shell-ink-subtle: "#9ca3af"
  shell-danger: "#dc2626"
  shell-danger-soft: "#fef2f2"
  shell-warning-soft: "#fef3c7"
  shell-warning-ink: "#92400e"
  shell-warning-banner: "#fbbf24"
  shell-success-soft: "#dcfce7"
  shell-success-ink: "#15803d"
  shell-badge-alert: "#ef4444"
  shell-tooltip: "#1f2937"
  # Inventory skin — app/(shell)/inventory only (CSS custom properties in app/globals.css)
  inventory-bg: "#eeedf6"
  inventory-surface: "#ffffff"
  inventory-surface-muted: "#f8f7fc"
  inventory-surface-hover: "#f1eef9"
  inventory-border: "#cfcae3"
  inventory-border-strong: "#aea7cc"
  inventory-divider: "#e6e2f2"
  inventory-text: "#1d1a36"
  inventory-text-muted: "#524e6e"
  inventory-text-subtle: "#5c5876"
  inventory-primary: "#5b3fd6"
  inventory-primary-hover: "#4a2fbf"
  inventory-primary-ring: "#c9bdf7"
  inventory-secondary: "#2563eb"
  inventory-secondary-hover: "#1d4ed8"
  inventory-accent: "#f59e0b"
  inventory-accent-hover: "#e08a00"
  inventory-accent-ink: "#3b2300"
  inventory-success: "#16a34a"
  inventory-success-hover: "#15803d"
  inventory-danger: "#dc2626"
  inventory-danger-hover: "#b91c1c"
  inventory-warning: "#d97706"
  inventory-warning-ink: "#92400e"
  inventory-sec-image: "#4338ca"
  inventory-sec-details: "#6d28d9"
  inventory-sec-pricing: "#1d4ed8"
  inventory-sec-stock: "#0f766e"
  inventory-sec-stores: "#047857"
  inventory-sec-variants: "#a21caf"
  inventory-sec-po: "#b45309"
  inventory-sec-stocktake: "#0369a1"
  inventory-sec-adjust: "#be123c"
  inventory-sec-import: "#0e7490"
  inventory-sec-activity: "#334155"
  inventory-sec-toolbar: "#4d7c0f"
  inventory-sec-subtabs: "#be185d"
typography:
  page-title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.556
  dialog-title:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.5
  body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  table-header:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "0.025em"
  inventory-body:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.25
  inventory-tab:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "9px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.3px"
  numeric:
    fontFamily: "Arial, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    fontFeature: "\"tnum\""
rounded:
  sm: "4px"
  md: "6px"
  control-compact: "7px"
  lg: "8px"
  card-compact: "10px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  inventory-gutter: "8px"
  page-gutter-mobile: "16px"
  page-gutter: "24px"
  card-padding: "20px"
  stack: "16px"
  shell-header-height: "60px"
  sidebar-width: "240px"
components:
  button-primary:
    backgroundColor: "{colors.shell-primary}"
    textColor: "{colors.shell-surface}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.shell-primary-hover}"
  button-secondary:
    backgroundColor: "{colors.shell-surface}"
    textColor: "{colors.shell-ink-secondary}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  button-secondary-hover:
    backgroundColor: "{colors.shell-surface-muted}"
  button-danger:
    backgroundColor: "{colors.shell-danger}"
    textColor: "{colors.shell-surface}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
  input:
    backgroundColor: "{colors.shell-surface}"
    textColor: "{colors.shell-ink}"
    rounded: "{rounded.lg}"
    padding: "8px 12px"
    typography: "{typography.body}"
  card:
    backgroundColor: "{colors.shell-surface}"
    rounded: "{rounded.xl}"
    padding: "{spacing.card-padding}"
  nav-item:
    backgroundColor: "{colors.shell-sidebar}"
    textColor: "{colors.shell-sidebar-ink}"
    rounded: "{rounded.lg}"
    padding: "10px 12px"
  nav-item-active:
    backgroundColor: "{colors.shell-primary}"
    textColor: "{colors.shell-surface}"
  chip-status:
    backgroundColor: "{colors.shell-warning-soft}"
    textColor: "{colors.shell-warning-ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  inventory-button-primary:
    backgroundColor: "{colors.inventory-primary}"
    textColor: "{colors.inventory-surface}"
    rounded: "{rounded.control-compact}"
    padding: "0 12px"
    height: "28px"
    typography: "{typography.inventory-body}"
  inventory-button-primary-hover:
    backgroundColor: "{colors.inventory-primary-hover}"
  inventory-button-secondary:
    backgroundColor: "{colors.inventory-surface}"
    textColor: "{colors.inventory-text-muted}"
    rounded: "{rounded.control-compact}"
    padding: "0 12px"
    height: "28px"
  inventory-button-secondary-hover:
    backgroundColor: "{colors.inventory-surface-hover}"
  inventory-button-danger:
    backgroundColor: "{colors.inventory-danger}"
    textColor: "{colors.inventory-surface}"
    rounded: "{rounded.control-compact}"
    height: "28px"
  inventory-tab:
    textColor: "{colors.inventory-primary}"
    rounded: "{rounded.md}"
    padding: "6px 6px"
    typography: "{typography.inventory-tab}"
  inventory-tab-active:
    backgroundColor: "{colors.inventory-primary}"
    textColor: "{colors.inventory-surface}"
  inventory-panel:
    backgroundColor: "{colors.inventory-surface}"
    rounded: "{rounded.xl}"
  inventory-card:
    backgroundColor: "{colors.inventory-surface}"
    rounded: "{rounded.card-compact}"
    padding: "12px"
---

# Design System: FulfilPro

## Overview

**Creative North Star: "The Dispatch Floor"**

FulfilPro is the screen a warehouse, a print table, and an admin desk all share. The North Star
is a well-run dispatch floor. Lots of work is visible at once. Every bay is labelled. You can
tell where an order is from across the room, without opening it. Density is a feature here, not
clutter: a picker or decorator scanning a queue mid-task needs the row to say *allocated / picked /
decorated / packed / fulfilled / delivered* by itself. Chrome stays neutral so that status color
carries the meaning.

The system ships as **two skins** that share one shell (dark sidebar, white 60px header) and one
font. The **Shell skin** covers every route except Inventory: Orders, Decoration, Picking List,
Back In Stock, Tasks, Messages, Tracking, Stores, Users, Settings, and Profile. It is built
directly from Tailwind's default gray and blue palette, at comfortable 14px density with 8px
rounded controls. The **Inventory skin** covers `app/(shell)/inventory` only. It is a namespaced
`inventory-*` token set with a violet primary on a lavender canvas. It runs at a much tighter
11px density with 28px controls, has a page-level zoom control, and gives each panel its own
accent hue so a crowded hub screen reads as separate zones. The two skins never mix inside one
surface.

The app is light-only (no dark mode), and operators may use it on a shop-floor tablet as well as
a desktop. Copy protection (`user-select: none`) on the order, decoration, and picking surfaces
is a deliberate product decision. It is not a styling bug.

**Key Characteristics:**
- Neutral chrome, semantic color: blue or violet means "act here", and red, amber, and green mean state.
- Two skins: Shell (gray/blue, `text-sm`) everywhere, and Inventory (violet tokens, 11px) on the hub catalogue.
- Tables and queues first. Cards hold forms and settings, not decoration.
- Flat surfaces with hairline borders and light shadows. Heavy shadows are reserved for overlays.
- One system sans (Arial), with weight doing the hierarchy work instead of size.

## Colors

The color strategy is restrained: neutral grays carry the structure, one action hue per skin
(blue for the shell, violet for inventory), and a small fixed semantic set for state.

### Primary
- **Dispatch Blue** (shell-primary): the shell's only action color. Used for primary buttons, the
  active sidebar item, the avatar, unread counts, links, and focus rings. Darkens to
  shell-primary-hover on hover. Its tint (shell-primary-soft) is used for selected rows and
  info callouts.
- **Hub Violet** (inventory-primary): the Inventory skin's action color. Used for primary footer
  buttons, the active module tab, and wizard gradients. Hover goes to inventory-primary-hover,
  and inventory-primary-ring is its soft focus halo.

### Secondary
- **Ledger Blue** (inventory-secondary): the secondary action and "in progress" color inside
  Inventory, for example the `PUBLISHING` listing badge. It is the same hue as Dispatch Blue, so
  the two skins have one blue in common.
- **Marigold** (inventory-accent): the Inventory highlight and the "near trigger" stock bar. Text
  sitting on Marigold uses inventory-accent-ink, not white.

### Tertiary
- **Section hues** (inventory-sec-*): thirteen deep, mid-saturation hues (indigo image, violet
  details, blue pricing, teal stock, emerald stores, fuchsia variants, amber POs, sky stocktake,
  rose adjustments, cyan import, slate activity, olive toolbar, pink sub-tabs). Each one belongs
  to a single panel and colors only that panel's heading icon or rule, so the screen splits into
  recognisable zones.

### Neutral
- **Floor Charcoal** (shell-sidebar): the sidebar background. It is the darkest surface in the
  app, and it frames the work area. Hover state uses shell-sidebar-hover, idle labels use
  shell-sidebar-ink, and the "FulfilPro" wordmark uses shell-brand-mark.
- **Paper White** (shell-surface): the page canvas, cards, header, and modals.
- **Bench Gray** (shell-surface-muted / shell-surface-sunken): table header rows, read-only info
  blocks, hover fills, and disabled inputs.
- **Hairline** (shell-border / shell-border-input): card and divider borders, and the slightly
  stronger input stroke.
- **Ink ramp** (shell-ink → shell-ink-subtle): gray-900 for titles, gray-700 for body, gray-600
  for secondary text, gray-500 for metadata, and gray-400 for placeholders and idle icons.
- **Lavender canvas** (inventory-bg) with inventory-surface panels, inventory-surface-muted
  wells, and the inventory-border / inventory-divider strokes. The Inventory ink ramp runs
  from inventory-text down to inventory-text-subtle.

### Semantic
- **Danger** (shell-danger, inventory-danger): destructive buttons, sign-out, errors, "below
  trigger" stock rows, and `FAILED` listings. Soft red fills (shell-danger-soft, `danger/10`) are
  for row and callout backgrounds.
- **Warning** (shell-warning-soft + shell-warning-ink, inventory-warning): pending and draft
  states, "near trigger" stock, and the session-expiry banner (shell-warning-banner).
- **Success** (shell-success-soft + shell-success-ink, inventory-success): fulfilled, listed,
  active, and the wizard's Finish button.
- **Alert dot** (shell-badge-alert): unread or overdue counters on nav icons and the bell.

### Named Rules
**The Status-Owns-Color Rule.** Outside the one action hue, saturated color means state, and
nothing else. Never use red, amber, or green for decoration, and never show a state with gray
alone.

**The Skin Boundary Rule.** `inventory-*` tokens are only used under `app/(shell)/inventory`
(plus the modals and portals it opens, which use the `compact` ModalShell). Shell routes use the
Tailwind gray/blue utilities. Don't mix the two skins on one surface.

**The One-Zone-One-Hue Rule.** Each Inventory section hue is assigned to exactly one panel. Don't
reuse a hue for a different panel, and don't use section hues for state.

## Typography

**Display Font:** none. There is no display face.
**Body Font:** Arial (with Helvetica, sans-serif), set on `body` in `app/globals.css`.
**Label/Mono Font:** the same sans. Tailwind `font-mono` is used sparingly, for IDs and codes.

**Character:** A plain, universally available system sans. It reads well at very small sizes and
prints predictably on picking slips and count sheets. Hierarchy comes from weight (semibold and
bold) and gray value, not from big size jumps. Note that `--font-sans` points at
`--font-geist-sans`, but Geist is never loaded, so what actually renders is Arial.

### Hierarchy
- **Page title** (600, 18px / `text-lg`): the shell header's page heading, with an optional
  `/ suffix` crumb in gray-300 and gray-600.
- **Dialog title** (600, 16px / `text-base`; 14px in compact Inventory modals): ModalShell headers.
- **Body** (400–500, 14px / `text-sm`): the shell's working size for table cells, form fields,
  nav labels, and buttons.
- **Label / meta** (500, 12px / `text-xs`): field labels, timestamps, and helper text. Table
  headers in the shell are 12px semibold, uppercase, with `tracking-wide`, in gray-500.
- **Inventory body** (600–700, 11px): Inventory buttons, chips, and cell text. Badges and
  tiny counters drop to 9–10.5px bold.
- **Inventory tab** (700, 9px, uppercase, 0.3px tracking): the module tab strip.
- **Numeric** (bold, `tabular-nums`): quantities, zoom percent, money, and counts, so columns line up.

### Named Rules
**The Weight-Not-Size Rule.** Only a few sizes are in use (`text-sm` and `text-xs` make up about
90% of the type). To make something stand out, raise the weight or darken the gray. Don't
introduce a new size.

**The Tabular Numbers Rule.** Any number that sits in a column or changes in place (stock, money,
counts, zoom) uses `tabular-nums`.

## Layout

**Shell frame.** A fixed dark sidebar sits on the left. It is 240px expanded and collapses to an
icon rail automatically below a 1500px viewport, with a 0.2s width transition and hover tooltips
on the rail. On mobile (<768px) it becomes an off-canvas drawer over a `gray-900/50` scrim. The
main column has a sticky white header (60px min-height, bottom hairline) holding the page title,
the tasks, messages, and notification buttons, the user name, and an avatar menu.

**Shell pages** render `<main className="flex-1 p-4 md:p-6 space-y-4">` (16px gutter on mobile,
24px from `md`), stacking full-width cards and tables. Forms inside cards use `p-4 md:p-5` and
`space-y-5`. Responsive behavior is mobile-first: buttons are `w-full` and become `sm:w-auto`, and
modals dock to the bottom edge on mobile (`items-end`) and center from `sm`.

**Inventory page** is a different spatial model. It uses an 8px gutter (`p-2`, `gap-2`) on the
lavender canvas. At `xl` (1280px) and above it locks to the viewport (`h-[calc(100vh-60px)]`,
`overflow-hidden`) and becomes a no-page-scroll workspace: a module tab bar, then the product
toolbar, then flex panels that scroll internally (`thin-scroll`). The whole page can be zoomed with
the header's zoom trio, using CSS `zoom` plus a `--page-zoom` variable that modals use to keep
their size. The design target is a 1280×800 artboard (see `design/compact-v2/`).

**Density.** Shell tables use `px-4 py-3` cells. Inventory tables use `px-2 py-1` cells and
scroll internally past a fixed row count instead of growing the page.

## Elevation & Depth

The system is flat by default and uses tonal layering. Depth mostly comes from hairline borders
and surface tone: white cards on a white or lavender canvas, gray-50 header rows, and muted wells.
Shadows stay small and structural on resting surfaces. Heavy shadows are kept for layers that
actually float above the page.

### Shadow Vocabulary
- **Resting card** (`shadow-sm`): shell cards and table wrappers, always paired with a gray-200 border.
- **Inventory resting** (shadow-inventory, a soft violet-tinted 1–3px shadow): Inventory panels,
  the active tab, and wizard cards.
- **Hover lift** (`0 4px 16px rgba(0,0,0,.08)`): store cards on hover only.
- **Popover** (`shadow-lg`): the avatar menu, dropdowns, and toasts.
- **Overlay** (`shadow-xl`, or shadow-inventory-md in Inventory): ModalShell dialogs.
- **Blocking** (`shadow-2xl` on a `rounded-2xl` card over a `gray-900/60` scrim): the access-restricted
  and session-blocking screens.

### Named Rules
**The Shadow-Means-Floating Rule.** A resting surface gets a border and at most `shadow-sm` (or
shadow-inventory). Anything at `shadow-lg` or above has to be a real overlay: a menu, dialog, or
toast.

## Shapes

Gently rounded, never pill-shaped except for chips and counters. Controls and inputs are 8px
(`rounded-lg`, the most used radius). Small utility elements such as tooltips, inline tags, and
the banner button are 4px (`rounded`). Cards and table containers are 12px (`rounded-xl`), and
blocking dialogs go up to 16px (`rounded-2xl`). Inventory compresses this scale: 7px for its 28px
buttons, 10px for wizard cards and the tab bar, and 6px for tab pills. Status badges, avatars,
unread counters, and filter chips are fully round (`rounded-full`). Borders are 1px hairlines
everywhere, and there are no double borders or thick strokes.

## Components

### Buttons
Plain, solid, and quick to read. Every button has `cursor-pointer` and a 150ms color transition.
- **Shape:** 8px radius in the shell (`rounded-lg`). In Inventory it is 7px on a fixed 28px height.
- **Primary:** Dispatch Blue fill, white 14px semibold or medium text, `px-4 py-2` (`py-2.5` for
  full-width form submits). On hover it darkens to blue-700. When disabled it drops to 60% opacity
  with a `not-allowed` cursor.
- **Secondary:** white fill, gray-300 border, gray-600 semibold text, gray-50 hover fill.
- **Danger:** red-600 fill with red-700 on hover (or red-500 → red-600 on blocking screens).
- **Icon buttons:** gray-400 or gray-500 idle, with a gray-100 rounded hover fill. A destructive
  icon turns red on hover.
- **Inventory:** `MODAL_FOOTER_BTN_PRIMARY / _SECONDARY / _DANGER` in `components/ModalShell.tsx`
  are 28px tall with 11px bold text. Wizard primary and Finish buttons add a left-to-right
  gradient and a tinted 1px shadow (`app/(shell)/inventory/modules/modalStyles.tsx`).

### Chips
- **Status badge:** a `rounded-full` pill (`px-2 py-0.5`, 11–12px semibold) with a soft tint fill,
  a darker ink, and an optional same-hue border at 30%. Examples are amber-100/amber-800 for
  pending, green-100/green-700 for fulfilled, and red-50/red-600 for failed.
- **Inventory status:** a mapped set in `inventory/modules/constants.ts` (`STATUS_STYLES`,
  `PRODUCT_STATUS_BADGES`, `LISTING_STATUS_BADGES`) built from `token/10–15` fills with
  `token/30` borders.
- **Counters:** a solid red or blue `rounded-full` dot showing a count in 9–10px bold white.
- **Day chips** (Settings): toggleable chips with a 150ms color transition.

### Cards / Containers
- **Corner Style:** 12px (`rounded-xl`).
- **Background:** Paper White on the shell canvas, or inventory-surface on the lavender canvas.
- **Shadow Strategy:** resting card shadow, see Elevation & Depth.
- **Border:** 1px gray-200 (or inventory-border).
- **Internal Padding:** `p-4 md:p-5` for form cards. Table cards are `overflow-hidden` with no
  padding, so the table runs edge to edge.

### Inputs / Fields
- **Style:** full width, 1px gray-300 stroke, white fill, 8px radius, `px-3 py-2`, 14px text.
- **Focus:** the native outline is removed and replaced with a 2px blue-500 ring
  (`focus:ring-2 focus:ring-blue-500`, or blue-400 on some forms).
- **Error / Disabled:** a server or client error appears as red 12px text below the field (from
  `useRequest` `errors`). Disabled fields use a gray-100 fill.
- **Inventory:** number inputs hide the browser's spinner arrows (arrow keys still work), and the
  ring uses inventory-primary-ring.

### Navigation
- **Sidebar:** Floor Charcoal. Items are `px-3 py-2.5`, `rounded-lg`, 14px medium, with a 20px
  stroke icon. Idle items are gray-300 text with a gray-700 hover fill. The **active** item is a
  solid Dispatch Blue pill with white text. Child links show a 6px current-color dot. When the
  rail is collapsed, the label moves into a gray-700 hover tooltip.
- **Header:** a white sticky bar holding the page title (with a crumb suffix), utility icon
  buttons with count badges, and a 36px round blue avatar that opens a `rounded-xl shadow-lg` menu.
- **Inventory module tabs:** a tinted violet strip (`primary/6%` fill, `primary/25` border,
  10px radius). It contains 9px uppercase bold tab pills that are violet text when idle and a
  solid violet pill with white text when active.

### ModalShell (signature component)
`components/ModalShell.tsx` is the only dialog. It has a `gray-900/50` scrim and comes in four
widths (`max-w-md`, `wide` → 2xl, `extraWide` → 5xl, and `fullScreen` at 95vw). It has a titled
header with a close button, a scrolling body, and an optional bordered footer (`ModalActions`
gives a Cancel / Confirm pair). The `compact` prop switches it to the Inventory skin, and
`elevated` stacks it above another open modal. In Inventory, dialogs fade and pop in over
180–200ms (`cubic-bezier(0.16, 1, 0.3, 1)`). Under `prefers-reduced-motion` this becomes a plain
fade.

### Loading skeletons
In the shell, `useRequest`'s `loading` swaps table rows for `animate-pulse` gray bars that copy
the real row structure. Inventory uses `.inventory-bone` blocks, with a left-to-right shimmer
staggered 70ms per row through `--i`, which becomes a slow breathe under reduced motion.

## Do's and Don'ts

### Do:
- **Do** pick the skin by route: Tailwind gray/blue utilities outside Inventory, and `inventory-*`
  tokens (`bg-inventory-primary`, `shadow-inventory`, …) inside it.
- **Do** show every order, product, or stock state as a colored badge with a text label (Status-Owns-Color).
- **Do** use `text-sm` for shell body text and `text-xs` for labels and meta, and add emphasis with weight.
- **Do** build dialogs with `ModalShell` and `ModalActions` (pass `compact` in Inventory) instead of hand-rolled overlays.
- **Do** give inputs the standard `rounded-lg border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500` treatment and show errors inline below the field.
- **Do** keep `cursor-pointer`, a 150ms color transition, and a 60%-opacity disabled state on every interactive control.
- **Do** keep Inventory surfaces inside the 1280×800 no-page-scroll budget, with long lists scrolling inside their panel (`thin-scroll`).
- **Do** use `tabular-nums` for quantities, money, and counts.

### Don't:
- **Don't** use `inventory-*` tokens on shell routes, or raw Tailwind violet or indigo inside Inventory in place of its tokens.
- **Don't** add a second action hue to either skin. Blue (shell) and violet (inventory) are the only "click here" colors.
- **Don't** use red, amber, or green for decoration or emphasis. Those colors mean state.
- **Don't** put `shadow-lg` or larger on resting cards or panels. Those shadows are for overlays.
- **Don't** remove the copy-protection classes (`protected-orders-page`, `[data-protected]`) from order, decoration, or picking surfaces. They are a product decision.
- **Don't** add new type sizes or a display font for emphasis. Use weight and gray value.
- **Don't** reuse an Inventory section hue (`inventory-sec-*`) for a different panel or for status.
