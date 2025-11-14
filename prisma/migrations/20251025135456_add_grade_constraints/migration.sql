/*
  Warnings:

  - A unique constraint covering the columns `[moduleId,learnerId]` on the table `Grade` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_learnerId_fkey";

-- DropForeignKey
ALTER TABLE "Grade" DROP CONSTRAINT "Grade_moduleId_fkey";

-- AlterTable
ALTER TABLE "Grade" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Grade_learnerId_idx" ON "Grade"("learnerId");

-- CreateIndex
CREATE INDEX "Grade_moduleId_idx" ON "Grade"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_moduleId_learnerId_key" ON "Grade"("moduleId", "learnerId");

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;
