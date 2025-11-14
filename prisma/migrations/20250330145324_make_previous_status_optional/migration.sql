-- AlterEnum
ALTER TYPE "LearnerStatus" ADD VALUE 'WAITING';

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "LearnerStatusHistory" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "previousStatus" "LearnerStatus",
    "newStatus" "LearnerStatus" NOT NULL,
    "reason" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearnerStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearnerStatusHistory_learnerId_idx" ON "LearnerStatusHistory"("learnerId");

-- AddForeignKey
ALTER TABLE "LearnerStatusHistory" ADD CONSTRAINT "LearnerStatusHistory_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
