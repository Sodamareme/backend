-- AlterTable
ALTER TABLE "Learner" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "LearnerAttendance" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Module" ADD COLUMN     "sessionId" TEXT;

-- AlterTable
ALTER TABLE "Promotion" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Referential" ADD COLUMN     "numberOfSessions" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "sessionLength" INTEGER;

-- AlterTable
ALTER TABLE "Vigil" ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "referentialId" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_referentialId_name_key" ON "Session"("referentialId", "name");

-- AddForeignKey
ALTER TABLE "Learner" ADD CONSTRAINT "Learner_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_referentialId_fkey" FOREIGN KEY ("referentialId") REFERENCES "Referential"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Module" ADD CONSTRAINT "Module_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;
