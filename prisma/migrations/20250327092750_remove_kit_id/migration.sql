/*
  Warnings:

  - You are about to drop the column `kitId` on the `Learner` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Learner_kitId_key";

-- AlterTable
ALTER TABLE "Learner" DROP COLUMN "kitId";
