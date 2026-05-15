ALTER TABLE "AppSettings"
ADD COLUMN "loginApprovalRecipientUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "backInStockAdminRecipientUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "stockAdjustmentRecipientUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "fulfillmentRequestAllowedUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "fulfillmentRequestDefaultUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "pickingPackingAllowedUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "pickingPackingDefaultUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "directMessageAllowedUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "directMessageDefaultUserIds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "backInStockRequesterUpdatesEnabled" BOOLEAN NOT NULL DEFAULT true;
