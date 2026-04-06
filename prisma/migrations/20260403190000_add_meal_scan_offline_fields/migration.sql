ALTER TABLE "MealScan"
ADD COLUMN "serviceDate" TIMESTAMP(3),
ADD COLUMN "scannedAtClient" TIMESTAMP(3),
ADD COLUMN "deviceId" TEXT,
ADD COLUMN "clientScanId" TEXT;

UPDATE "MealScan"
SET "serviceDate" = date_trunc('day', "scannedAt")
WHERE "serviceDate" IS NULL;

ALTER TABLE "MealScan"
ALTER COLUMN "serviceDate" SET NOT NULL;

CREATE UNIQUE INDEX "MealScan_clientScanId_key" ON "MealScan"("clientScanId");
CREATE INDEX "MealScan_serviceDate_idx" ON "MealScan"("serviceDate");
CREATE INDEX "MealScan_deviceId_idx" ON "MealScan"("deviceId");
CREATE INDEX "MealScan_learnerId_type_serviceDate_idx" ON "MealScan"("learnerId", "type", "serviceDate");
