-- Phase 2: Transactional Outbox + Inventory Constraints + Order Number Sequence

-- 1) Outbox events table (for transactional event publishing)
CREATE TABLE IF NOT EXISTS "outbox_events" (
  "id" TEXT NOT NULL,
  "event_name" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "outbox_events_status_idx" ON "outbox_events"("status");
CREATE INDEX IF NOT EXISTS "outbox_events_created_at_idx" ON "outbox_events"("created_at");

-- 2) Order number sequence (DB-level, concurrency safe)
CREATE SEQUENCE IF NOT EXISTS sales_order_number_seq START WITH 1;

-- 3) Inventory safety constraints (non-negative where applicable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_quantity_reserved_nonneg'
  ) THEN
    ALTER TABLE "inventory_items"
      ADD CONSTRAINT "inventory_items_quantity_reserved_nonneg"
      CHECK ("quantity_reserved" >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_quantity_on_hand_nonneg'
  ) THEN
    ALTER TABLE "inventory_items"
      ADD CONSTRAINT "inventory_items_quantity_on_hand_nonneg"
      CHECK ("quantity_on_hand" >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_minimum_level_nonneg'
  ) THEN
    ALTER TABLE "inventory_items"
      ADD CONSTRAINT "inventory_items_minimum_level_nonneg"
      CHECK ("minimum_level" >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_reorder_point_nonneg'
  ) THEN
    ALTER TABLE "inventory_items"
      ADD CONSTRAINT "inventory_items_reorder_point_nonneg"
      CHECK ("reorder_point" >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_average_cost_nonneg'
  ) THEN
    ALTER TABLE "inventory_items"
      ADD CONSTRAINT "inventory_items_average_cost_nonneg"
      CHECK ("average_cost" >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_items_maximum_level_nonneg'
  ) THEN
    ALTER TABLE "inventory_items"
      ADD CONSTRAINT "inventory_items_maximum_level_nonneg"
      CHECK ("maximum_level" IS NULL OR "maximum_level" >= 0) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_batches_quantity_remaining_nonneg'
  ) THEN
    ALTER TABLE "inventory_batches"
      ADD CONSTRAINT "inventory_batches_quantity_remaining_nonneg"
      CHECK ("quantity_remaining" >= 0 OR "is_virtual_negative") NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_batches_quantity_received_nonneg'
  ) THEN
    ALTER TABLE "inventory_batches"
      ADD CONSTRAINT "inventory_batches_quantity_received_nonneg"
      CHECK ("quantity_received" >= 0 OR "is_virtual_negative") NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_batches_cost_per_unit_nonneg'
  ) THEN
    ALTER TABLE "inventory_batches"
      ADD CONSTRAINT "inventory_batches_cost_per_unit_nonneg"
      CHECK ("cost_per_unit" >= 0) NOT VALID;
  END IF;
END $$;
