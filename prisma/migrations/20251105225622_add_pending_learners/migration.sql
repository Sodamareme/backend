/*
  Warnings:

  - You are about to drop the `PendingLearner` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "PendingLearner" DROP CONSTRAINT "PendingLearner_promotionId_fkey";

-- DropForeignKey
ALTER TABLE "PendingLearner" DROP CONSTRAINT "PendingLearner_refId_fkey";

-- DropTable
DROP TABLE "PendingLearner";

-- CreateTable
CREATE TABLE "pending_learners" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "birthPlace" TEXT NOT NULL,
    "photoUrl" TEXT,
    "promotionId" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "tutorData" JSONB NOT NULL,
    "status" "PendingStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,

    CONSTRAINT "pending_learners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_learners_email_key" ON "pending_learners"("email");

-- CreateIndex
CREATE UNIQUE INDEX "pending_learners_phone_key" ON "pending_learners"("phone");

-- CreateIndex
CREATE INDEX "pending_learners_email_idx" ON "pending_learners"("email");

-- CreateIndex
CREATE INDEX "pending_learners_status_idx" ON "pending_learners"("status");

-- CreateIndex
CREATE INDEX "pending_learners_createdAt_idx" ON "pending_learners"("createdAt");

-- AddForeignKey
ALTER TABLE "pending_learners" ADD CONSTRAINT "pending_learners_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_learners" ADD CONSTRAINT "pending_learners_refId_fkey" FOREIGN KEY ("refId") REFERENCES "Referential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
