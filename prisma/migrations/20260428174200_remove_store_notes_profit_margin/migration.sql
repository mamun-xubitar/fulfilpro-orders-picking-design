-- Remove store notes and profit margin fields
ALTER TABLE "Store"
DROP COLUMN IF EXISTS "notes",
DROP COLUMN IF EXISTS "profitMargin";
