-- CreateTable
CREATE TABLE "StaffLoginApproval" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "approveToken" TEXT NOT NULL,
    "rejectToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffLoginApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffLoginApproval_approveToken_key" ON "StaffLoginApproval"("approveToken");

-- CreateIndex
CREATE UNIQUE INDEX "StaffLoginApproval_rejectToken_key" ON "StaffLoginApproval"("rejectToken");

-- CreateIndex
CREATE INDEX "StaffLoginApproval_userId_idx" ON "StaffLoginApproval"("userId");

-- CreateIndex
CREATE INDEX "StaffLoginApproval_email_idx" ON "StaffLoginApproval"("email");

-- CreateIndex
CREATE INDEX "StaffLoginApproval_status_idx" ON "StaffLoginApproval"("status");

-- CreateIndex
CREATE INDEX "StaffLoginApproval_expiresAt_idx" ON "StaffLoginApproval"("expiresAt");

-- AddForeignKey
ALTER TABLE "StaffLoginApproval" ADD CONSTRAINT "StaffLoginApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
