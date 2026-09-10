-- Rename in place so every existing preset (and its unique index) survives — a plain rename,
-- not a drop+recreate, since `prisma migrate dev` would otherwise generate a destructive pair
-- for what the schema diff reads as "delete ColourPreset, create ColourPresetGroup".
ALTER TABLE "ColourPreset" RENAME TO "ColourPresetGroup";
ALTER TABLE "SizePreset" RENAME TO "SizePresetGroup";

-- Bring index names in line with what Prisma expects for the new model names.
ALTER INDEX "ColourPreset_pkey" RENAME TO "ColourPresetGroup_pkey";
ALTER INDEX "ColourPreset_key_key" RENAME TO "ColourPresetGroup_key_key";
ALTER INDEX "SizePreset_pkey" RENAME TO "SizePresetGroup_pkey";
ALTER INDEX "SizePreset_key_key" RENAME TO "SizePresetGroup_key_key";

-- name -> items: every existing preset becomes a one-member group. For a 1-item group,
-- groupKeyOf([name]) === presetKeyOf(name) — exactly what `key` already holds — so `key` needs
-- no rewrite here.
ALTER TABLE "ColourPresetGroup" ADD COLUMN "items" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "ColourPresetGroup" SET "items" = ARRAY["name"];
ALTER TABLE "ColourPresetGroup" DROP COLUMN "name";

ALTER TABLE "SizePresetGroup" ADD COLUMN "items" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "SizePresetGroup" SET "items" = ARRAY["name"];
ALTER TABLE "SizePresetGroup" DROP COLUMN "name";
