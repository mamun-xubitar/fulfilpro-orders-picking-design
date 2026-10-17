import type { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/**
 * Stock on hand is held per location (SupplierProductVariantLocation.quantity). While a variant has
 * any location, its stockOnHand is kept equal to the sum of them, so everything that only reads the
 * total (available, Shopify publish, product totals) keeps reading stockOnHand. A variant with no
 * location holds its stockOnHand unassigned. Every stock write goes through here, inside the
 * caller's transaction.
 */

/** A refused stock write — the message is safe to show the admin as-is. */
export class StockError extends Error {
  /** The locations that refused the write (set when it was a still-holding-stock refusal). */
  constructor(message: string, readonly holding: LocationStock[] = []) {
    super(message);
  }
}

/** "RAJSHSHI (100)", "RAJSHSHI (100) and RANGPUR (50)", "A (1), B (2) and C (3)". */
export function describeHolding(holding: LocationStock[]): string {
  const parts = holding.map((l) => `${l.name} (${l.quantity})`);
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export type LocationStock = { locationId: string; name: string; quantity: number };

/** Moves the stock of a removed location into a kept one: `remap[fromLocationId]` is the
 * destination's location id, which must survive the write. */
export type StockRemap = Record<string, string>;

/** Where a write landed: the location (null for a variant with none) and its stock just before. */
export type StockMove = { locationId: string | null; locationName: string | null; before: number };

/** Row-locks the variant for the rest of the transaction, so concurrent writes to its locations
 * and total serialise. False when the variant doesn't exist. */
async function lockVariant(tx: Tx, variantId: string): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "SupplierProductVariant" WHERE "id" = ${variantId} FOR UPDATE`;
  return rows.length > 0;
}

/** The variant's locations with their stock, A→Z by name — the first is where stock without a
 * location of its own goes. */
export async function variantLocationStock(tx: Tx, variantId: string): Promise<LocationStock[]> {
  const rows = await tx.supplierProductVariantLocation.findMany({
    where: { variantId },
    select: { locationId: true, quantity: true, location: { select: { name: true } } },
  });
  return rows.map((r) => ({ locationId: r.locationId, name: r.location.name, quantity: r.quantity })).sort((a, b) => a.name.localeCompare(b.name));
}

/** stockOnHand = Σ location quantities, for a variant that has any location (no-op otherwise). */
async function syncVariantTotal(tx: Tx, variantId: string) {
  await tx.$executeRaw`
    UPDATE "SupplierProductVariant" v
    SET "stockOnHand" = s.total, "updatedAt" = NOW()
    FROM (
      SELECT COALESCE(SUM("quantity"), 0)::int AS total
      FROM "SupplierProductVariantLocation"
      WHERE "variantId" = ${variantId}
      HAVING COUNT(*) > 0
    ) s
    WHERE v."id" = ${variantId}`;
}

/**
 * Adds `delta` (either sign) at `locationId`, or at the variant's first location when null, or to
 * its unassigned stock when it has no location. The caller validates that a negative delta fits.
 */
export async function addStock(tx: Tx, variantId: string, locationId: string | null, delta: number): Promise<StockMove | null> {
  if (!(await lockVariant(tx, variantId))) return null;
  const locations = await variantLocationStock(tx, variantId);
  if (locations.length === 0) {
    const v = await tx.supplierProductVariant.update({ where: { id: variantId }, data: { stockOnHand: { increment: delta } }, select: { stockOnHand: true } });
    return { locationId: null, locationName: null, before: v.stockOnHand - delta };
  }
  const target = locationId ? locations.find((l) => l.locationId === locationId) : locations[0];
  if (!target) throw new StockError('Pick one of the variant’s own locations');
  await tx.supplierProductVariantLocation.update({
    where: { variantId_locationId: { variantId, locationId: target.locationId } },
    data: { quantity: { increment: delta } },
  });
  await syncVariantTotal(tx, variantId);
  return { locationId: target.locationId, locationName: target.name, before: target.quantity };
}

/** Takes `qty` out of the variant — from `preferLocationId` first when the variant has it (an order
 * fulfilled at a mapped store location), then from the location holding the most, spilling into the
 * next — never below 0. Resolves to what was taken at each location ([] for a variant with no
 * location), or null when the variant doesn't exist. */
export async function takeStock(tx: Tx, variantId: string, qty: number, preferLocationId: string | null = null): Promise<LocationStock[] | null> {
  if (!(await lockVariant(tx, variantId))) return null;
  const locations = await variantLocationStock(tx, variantId);
  if (locations.length === 0) {
    await tx.$executeRaw`UPDATE "SupplierProductVariant" SET "stockOnHand" = GREATEST(0, "stockOnHand" - ${qty}), "updatedAt" = NOW() WHERE "id" = ${variantId}`;
    return [];
  }
  const ordered = [...locations].sort((a, b) => (a.locationId === preferLocationId ? -1 : b.locationId === preferLocationId ? 1 : b.quantity - a.quantity));
  const taken: LocationStock[] = [];
  let remaining = qty;
  for (const l of ordered) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Math.max(0, l.quantity));
    if (take === 0) continue;
    await tx.supplierProductVariantLocation.update({
      where: { variantId_locationId: { variantId, locationId: l.locationId } },
      data: { quantity: { decrement: take } },
    });
    taken.push({ locationId: l.locationId, name: l.name, quantity: take });
    remaining -= take;
  }
  await syncVariantTotal(tx, variantId);
  return taken;
}

/**
 * Makes `entries` exactly the variant's locations and their stock. Dropping a location that
 * still holds stock is refused unless `remap` moves it into a location that survives (its
 * quantity is added to the destination's). Dropping every location leaves the variant with no
 * location and (necessarily) 0 unassigned stock — so clearing with stock is always refused.
 */
export async function setLocationStock(tx: Tx, variantId: string, entries: { locationId: string; quantity: number }[], remap: StockRemap = {}) {
  if (!(await lockVariant(tx, variantId))) return;
  const current = await variantLocationStock(tx, variantId);
  const nextIds = new Set(entries.map((e) => e.locationId));
  const holding = current.filter((l) => !nextIds.has(l.locationId) && l.quantity > 0);
  const byId = new Map(entries.map((e) => [e.locationId, e]));
  for (const h of holding) {
    const destId = remap[h.locationId];
    const dest = destId ? byId.get(destId) : undefined;
    if (!dest || destId === h.locationId) {
      throw new StockError(`${describeHolding(holding)} still ${holding.length === 1 ? 'holds' : 'hold'} stock — set to 0 before removing`, holding);
    }
    dest.quantity += h.quantity;
  }
  await tx.supplierProductVariantLocation.deleteMany({ where: { variantId, locationId: { notIn: [...nextIds] } } });
  for (const { locationId, quantity } of entries) {
    await tx.supplierProductVariantLocation.upsert({
      where: { variantId_locationId: { variantId, locationId } },
      create: { variantId, locationId, quantity },
      update: { quantity },
    });
  }
  await syncVariantTotal(tx, variantId);
}

/**
 * Bulk location assignment for one variant: `add` keeps its locations and adds `locationIds` at 0;
 * `replace` makes `locationIds` its set (a dropped location holding stock is refused unless
 * `remap` moves it into a survivor). A variant that had no location moves its unassigned stock
 * into the first new location (A→Z).
 */
export async function assignLocations(tx: Tx, variantId: string, locationIds: string[], namesById: Map<string, string>, mode: 'add' | 'replace', remap: StockRemap = {}) {
  if (!(await lockVariant(tx, variantId))) return;
  const current = await variantLocationStock(tx, variantId);
  const kept = mode === 'add' ? current : current.filter((l) => locationIds.includes(l.locationId));
  const added = locationIds
    .filter((id) => !current.some((l) => l.locationId === id))
    .sort((a, b) => (namesById.get(a) ?? '').localeCompare(namesById.get(b) ?? ''));
  const entries = [...kept.map((l) => ({ locationId: l.locationId, quantity: l.quantity })), ...added.map((locationId) => ({ locationId, quantity: 0 }))];
  if (current.length === 0 && entries.length > 0) {
    const v = await tx.supplierProductVariant.findUniqueOrThrow({ where: { id: variantId }, select: { stockOnHand: true } });
    entries[0].quantity = v.stockOnHand;
  }
  await setLocationStock(tx, variantId, entries, remap);
}

/** Brings the variant's total to `total` when only a total is known (CSV import): a rise goes to
 * the first location, a fall comes out of the fullest locations first. */
export async function setVariantTotal(tx: Tx, variantId: string, total: number) {
  if (!(await lockVariant(tx, variantId))) return;
  const locations = await variantLocationStock(tx, variantId);
  if (locations.length === 0) {
    await tx.supplierProductVariant.update({ where: { id: variantId }, data: { stockOnHand: total } });
    return;
  }
  const diff = total - locations.reduce((sum, l) => sum + l.quantity, 0);
  if (diff > 0) await addStock(tx, variantId, null, diff);
  else if (diff < 0) await takeStock(tx, variantId, -diff);
}
