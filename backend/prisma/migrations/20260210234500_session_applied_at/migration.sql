-- Add idempotency marker for session payment aggregation
ALTER TABLE "payments"
ADD COLUMN "session_applied_at" TIMESTAMP;
