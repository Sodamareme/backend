/*
  Warnings:

  - A unique constraint covering the columns `[learnerId]` on the table `Kit` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Learner" DROP CONSTRAINT "Learner_kitId_fkey";

-- AlterTable
ALTER TABLE "Kit" ADD COLUMN     "learnerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Kit_learnerId_key" ON "Kit"("learnerId");

-- AddForeignKey
ALTER TABLE "Kit" ADD CONSTRAINT "Kit_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE SET NULL ON UPDATE CASCADE;
