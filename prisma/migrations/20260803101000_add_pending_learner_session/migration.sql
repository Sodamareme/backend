-- Allow a pending learner to keep the selected session during public registration
ALTER TABLE "pending_learners"
ADD COLUMN "sessionId" TEXT;

ALTER TABLE "pending_learners"
ADD CONSTRAINT "pending_learners_sessionId_fkey"
FOREIGN KEY ("sessionId") REFERENCES "Session"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
