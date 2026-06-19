-- CreateTable
CREATE TABLE "LineItemAssignment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assigneeName" TEXT NOT NULL,
    "assigneeEmail" TEXT NOT NULL,
    "assigneeRole" TEXT NOT NULL,
    "category" TEXT,
    "dueDate" TIMESTAMP(3),
    "assignedById" TEXT,
    "assignedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LineItemAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LineItemAssignment_orderId_idx" ON "LineItemAssignment"("orderId");

-- CreateIndex
CREATE INDEX "LineItemAssignment_assigneeId_idx" ON "LineItemAssignment"("assigneeId");

-- CreateIndex
CREATE UNIQUE INDEX "LineItemAssignment_orderId_lineItemId_assigneeId_key" ON "LineItemAssignment"("orderId", "lineItemId", "assigneeId");

-- AddForeignKey
ALTER TABLE "LineItemAssignment" ADD CONSTRAINT "LineItemAssignment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
