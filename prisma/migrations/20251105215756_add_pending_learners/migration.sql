-- CreateEnum
CREATE TYPE "PendingStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "PendingLearner" (
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

    CONSTRAINT "PendingLearner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PendingLearner_email_key" ON "PendingLearner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PendingLearner_phone_key" ON "PendingLearner"("phone");

-- CreateIndex
CREATE INDEX "PendingLearner_email_idx" ON "PendingLearner"("email");

-- CreateIndex
CREATE INDEX "PendingLearner_status_idx" ON "PendingLearner"("status");

-- CreateIndex
CREATE INDEX "PendingLearner_createdAt_idx" ON "PendingLearner"("createdAt");

-- AddForeignKey
ALTER TABLE "PendingLearner" ADD CONSTRAINT "PendingLearner_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingLearner" ADD CONSTRAINT "PendingLearner_refId_fkey" FOREIGN KEY ("refId") REFERENCES "Referential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
