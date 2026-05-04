ALTER TABLE "User"
ADD COLUMN "isLoggedIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lastLoginAt" TIMESTAMP(3),
ADD COLUMN "lastLogoutAt" TIMESTAMP(3);

CREATE INDEX "User_isLoggedIn_idx" ON "User"("isLoggedIn");
