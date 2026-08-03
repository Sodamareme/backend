-- Add session-level attendance closure so one cohort session can be closed
-- without blocking the next session of the same referential.
ALTER TABLE "Session"
ADD COLUMN "attendanceClosedAt" TIMESTAMP(3);
