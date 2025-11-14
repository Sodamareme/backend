-- AlterTable
ALTER TABLE "CoachAttendance" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Event" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "LearnerAttendance" ADD COLUMN     "justificationComment" TEXT;

-- AlterTable
ALTER TABLE "Restaurateur" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;
