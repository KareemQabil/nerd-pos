/*
  Warnings:

  - The `status` column on the `outbox_events` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'RETRY', 'PROCESSED', 'DEAD');

-- DropIndex
DROP INDEX "outbox_events_created_at_idx";

-- DropIndex
DROP INDEX "outbox_events_status_idx";

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "preferred_language" VARCHAR(10) NOT NULL DEFAULT 'en',
ADD COLUMN     "tier_id" TEXT;

-- AlterTable
ALTER TABLE "outbox_events" ADD COLUMN     "dead_at" TIMESTAMP(3),
ADD COLUMN     "locked_at" TIMESTAMP(3),
ADD COLUMN     "locked_by" VARCHAR(100),
ADD COLUMN     "next_run_at" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "refunded_amount" DECIMAL(12,3) DEFAULT 0,
ALTER COLUMN "session_applied_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "sales_orders" ADD COLUMN     "cancelled_at" TIMESTAMP(3),
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "confirmed_at" TIMESTAMP(3),
ADD COLUMN     "ordered_at" TIMESTAMP(3),
ADD COLUMN     "table_id" TEXT;

-- CreateTable
CREATE TABLE "order_item_modifiers" (
    "id" TEXT NOT NULL,
    "order_item_id" TEXT NOT NULL,
    "modifier_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "price" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "order_item_modifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "label" VARCHAR(50) NOT NULL,
    "street" VARCHAR(255) NOT NULL,
    "building" VARCHAR(100),
    "floor" VARCHAR(20),
    "apartment" VARCHAR(50),
    "city" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "instructions" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loyalty_tiers" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "min_spent" DECIMAL(12,3) NOT NULL,
    "min_orders" INTEGER NOT NULL,
    "points_multiplier" DECIMAL(5,2) NOT NULL,
    "discount_percent" DECIMAL(5,2) NOT NULL,
    "color" VARCHAR(20) NOT NULL,
    "icon" VARCHAR(100),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "loyalty_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" TEXT NOT NULL,
    "street" VARCHAR(255) NOT NULL,
    "city" VARCHAR(100) NOT NULL,
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(50) NOT NULL DEFAULT 'SA',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "building" VARCHAR(100),
    "floor" VARCHAR(20),
    "apartment" VARCHAR(50),
    "landmark" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbox_events" (
    "id" TEXT NOT NULL,
    "consumer" VARCHAR(150) NOT NULL,
    "event_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_item_modifiers_order_item_id_idx" ON "order_item_modifiers"("order_item_id");

-- CreateIndex
CREATE INDEX "order_item_modifiers_modifier_id_idx" ON "order_item_modifiers"("modifier_id");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "refunds_status_idx" ON "refunds"("status");

-- CreateIndex
CREATE INDEX "customer_addresses_customer_id_idx" ON "customer_addresses"("customer_id");

-- CreateIndex
CREATE INDEX "customer_addresses_is_default_idx" ON "customer_addresses"("is_default");

-- CreateIndex
CREATE INDEX "loyalty_tiers_display_order_idx" ON "loyalty_tiers"("display_order");

-- CreateIndex
CREATE INDEX "loyalty_tiers_is_active_idx" ON "loyalty_tiers"("is_active");

-- CreateIndex
CREATE INDEX "inbox_events_processed_at_idx" ON "inbox_events"("processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "inbox_events_consumer_event_id_key" ON "inbox_events"("consumer", "event_id");

-- CreateIndex
CREATE INDEX "customers_tier_id_idx" ON "customers"("tier_id");

-- CreateIndex
CREATE INDEX "deliveries_address_id_idx" ON "deliveries"("address_id");

-- CreateIndex
CREATE INDEX "outbox_events_status_next_run_at_created_at_idx" ON "outbox_events"("status", "next_run_at", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_locked_at_idx" ON "outbox_events"("locked_at");

-- CreateIndex
CREATE INDEX "sales_orders_table_id_idx" ON "sales_orders"("table_id");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_kitchen_station_id_fkey" FOREIGN KEY ("kitchen_station_id") REFERENCES "kitchen_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_modifiers" ADD CONSTRAINT "order_item_modifiers_modifier_id_fkey" FOREIGN KEY ("modifier_id") REFERENCES "modifier_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tier_id_fkey" FOREIGN KEY ("tier_id") REFERENCES "loyalty_tiers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
