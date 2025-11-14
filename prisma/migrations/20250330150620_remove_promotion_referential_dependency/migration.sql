/*
  Warnings:

  - You are about to drop the column `promotionId` on the `Referential` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Referential" DROP CONSTRAINT "Referential_promotionId_fkey";

-- AlterTable
ALTER TABLE "Referential" DROP COLUMN "promotionId";

-- CreateTable
CREATE TABLE "_PromotionToReferential" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_PromotionToReferential_AB_unique" ON "_PromotionToReferential"("A", "B");

-- CreateIndex
CREATE INDEX "_PromotionToReferential_B_index" ON "_PromotionToReferential"("B");

-- AddForeignKey
ALTER TABLE "_PromotionToReferential" ADD CONSTRAINT "_PromotionToReferential_A_fkey" FOREIGN KEY ("A") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PromotionToReferential" ADD CONSTRAINT "_PromotionToReferential_B_fkey" FOREIGN KEY ("B") REFERENCES "Referential"("id") ON DELETE CASCADE ON UPDATE CASCADE;
