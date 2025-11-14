/*
  Warnings:

  - A unique constraint covering the columns `[matricule]` on the table `Coach` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[matricule]` on the table `Learner` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `matricule` to the `Coach` table without a default value. This is not possible if the table is not empty.
  - Added the required column `matricule` to the `Learner` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable for Coach
ALTER TABLE "Coach" ADD COLUMN "matricule" TEXT;
UPDATE "Coach" 
SET "matricule" = 'ODC-C' || 
    UPPER(LEFT("firstName", 1)) || 
    UPPER(LEFT("lastName", 1)) || 
    TO_CHAR(CURRENT_DATE, 'YY') ||
    LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0')
WHERE "matricule" IS NULL;
ALTER TABLE "Coach" ALTER COLUMN "matricule" SET NOT NULL;
ALTER TABLE "Coach" ADD CONSTRAINT "Coach_matricule_key" UNIQUE ("matricule");

-- AlterTable for Learner
ALTER TABLE "Learner" ADD COLUMN "matricule" TEXT;
UPDATE "Learner"
SET "matricule" = 'ODC-' || 
    UPPER(LEFT("firstName", 1)) || 
    UPPER(LEFT("lastName", 1)) || 
    TO_CHAR(CURRENT_DATE, 'YY') ||
    LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0')
WHERE "matricule" IS NULL;
ALTER TABLE "Learner" ALTER COLUMN "matricule" SET NOT NULL;
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_matricule_key" UNIQUE ("matricule");
