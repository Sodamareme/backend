-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH');

-- CreateTable
CREATE TABLE "MealScan" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "type" "MealType" NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "restaurateurId" TEXT NOT NULL,

    CONSTRAINT "MealScan_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MealScan" ADD CONSTRAINT "MealScan_learnerId_fkey" FOREIGN KEY ("learnerId") REFERENCES "Learner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealScan" ADD CONSTRAINT "MealScan_restaurateurId_fkey" FOREIGN KEY ("restaurateurId") REFERENCES "Restaurateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
