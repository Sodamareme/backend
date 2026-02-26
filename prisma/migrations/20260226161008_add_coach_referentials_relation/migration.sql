/*
  Warnings:

  - You are about to drop the column `refId` on the `Coach` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Coach" DROP CONSTRAINT "Coach_refId_fkey";

-- AlterTable
ALTER TABLE "Coach" DROP COLUMN "refId";

-- CreateTable
CREATE TABLE "_CoachReferentials" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_CoachReferentials_AB_unique" ON "_CoachReferentials"("A", "B");

-- CreateIndex
CREATE INDEX "_CoachReferentials_B_index" ON "_CoachReferentials"("B");

-- AddForeignKey
ALTER TABLE "_CoachReferentials" ADD CONSTRAINT "_CoachReferentials_A_fkey" FOREIGN KEY ("A") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CoachReferentials" ADD CONSTRAINT "_CoachReferentials_B_fkey" FOREIGN KEY ("B") REFERENCES "Referential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
