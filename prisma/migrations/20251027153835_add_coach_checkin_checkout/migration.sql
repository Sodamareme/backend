/*
  Warnings:

  - You are about to drop the `CoachAttendance` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CoachAttendance" DROP CONSTRAINT "CoachAttendance_coachId_fkey";

-- DropTable
DROP TABLE "CoachAttendance";

-- CreateTable
CREATE TABLE "coach_attendances" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkIn" TIMESTAMP(3),
    "checkOut" TIMESTAMP(3),
    "isPresent" BOOLEAN NOT NULL DEFAULT true,
    "isLate" BOOLEAN NOT NULL DEFAULT false,
    "coachId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "coach_attendances_coachId_idx" ON "coach_attendances"("coachId");

-- CreateIndex
CREATE INDEX "coach_attendances_date_idx" ON "coach_attendances"("date");

-- AddForeignKey
ALTER TABLE "coach_attendances" ADD CONSTRAINT "coach_attendances_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "Coach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
