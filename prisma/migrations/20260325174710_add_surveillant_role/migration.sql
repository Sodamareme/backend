-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'SURVEILLANT';

-- CreateTable
CREATE TABLE "Surveillant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Surveillant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Surveillant_userId_key" ON "Surveillant"("userId");

-- AddForeignKey
ALTER TABLE "Surveillant" ADD CONSTRAINT "Surveillant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
