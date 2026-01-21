-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT,
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "image_url" VARCHAR(500),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "sku" VARCHAR(50) NOT NULL,
    "barcode" VARCHAR(50),
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "description_ar" TEXT,
    "description_en" TEXT,
    "category_id" TEXT NOT NULL,
    "price" DECIMAL(12,3) NOT NULL,
    "cost" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "tax_category" VARCHAR(20) NOT NULL DEFAULT 'STANDARD',
    "unit_of_measure" VARCHAR(20) NOT NULL DEFAULT 'PIECE',
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "allow_negative_stock" BOOLEAN NOT NULL DEFAULT false,
    "has_modifiers" BOOLEAN NOT NULL DEFAULT false,
    "replenishment_method" VARCHAR(20) NOT NULL DEFAULT 'BUY',
    "kitchen_station_id" TEXT,
    "income_account_id" TEXT,
    "expense_account_id" TEXT,
    "preparation_time_minutes" INTEGER,
    "image_url" VARCHAR(500),
    "color_code" VARCHAR(7),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "custom_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_groups" (
    "id" TEXT NOT NULL,
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "selection_type" VARCHAR(20) NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "min_selections" INTEGER NOT NULL DEFAULT 0,
    "max_selections" INTEGER,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "modifier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modifier_options" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "price" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "modifier_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_modifier_groups" (
    "product_id" TEXT NOT NULL,
    "modifier_group_id" TEXT NOT NULL,

    CONSTRAINT "product_modifier_groups_pkey" PRIMARY KEY ("product_id","modifier_group_id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "quantity_on_hand" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "quantity_reserved" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minimum_level" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "maximum_level" DECIMAL(12,3),
    "reorder_point" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "average_cost" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_batches" (
    "id" TEXT NOT NULL,
    "inventory_item_id" TEXT NOT NULL,
    "batch_number" VARCHAR(50),
    "received_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" DATE,
    "quantity_received" DECIMAL(12,3) NOT NULL,
    "quantity_remaining" DECIMAL(12,3) NOT NULL,
    "cost_per_unit" DECIMAL(12,3) NOT NULL,
    "is_virtual_negative" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inventory_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "batch_id" TEXT,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_cost" DECIMAL(12,3),
    "total_value" DECIMAL(12,3),
    "reference_type" VARCHAR(30),
    "reference_id" VARCHAR(50),
    "reason" VARCHAR(255),
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "yield_quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "yield_unit" VARCHAR(20) NOT NULL DEFAULT 'PIECE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "ingredient_product_id" TEXT NOT NULL,
    "quantity_required" DECIMAL(12,3) NOT NULL,
    "unit" VARCHAR(20) NOT NULL,
    "is_prepared" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "order_number" VARCHAR(30) NOT NULL,
    "order_type" VARCHAR(30) NOT NULL,
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "business_date" DATE NOT NULL,
    "item_subtotal" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "service_charge_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "service_charge_amount" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "delivery_charge" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "subtotal_before_tax" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "discounted_subtotal" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "tax_rate" DECIMAL(5,4) NOT NULL,
    "tax_amount" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "grand_total" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "tip_amount" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "total_with_tip" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    "payment_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "zatca_uuid" VARCHAR(50),
    "zatca_hash" VARCHAR(100),
    "zatca_previous_hash" VARCHAR(100),
    "qr_code" TEXT,
    "eta_uuid" VARCHAR(50),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "session_id" TEXT NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name_ar" VARCHAR(255),
    "product_name_en" VARCHAR(255),
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_price" DECIMAL(12,3) NOT NULL,
    "modifiers_amount" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "line_total" DECIMAL(12,3) NOT NULL,
    "cost_per_unit" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "total_cost" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_method_configs" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "name_en" VARCHAR(100) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "requires_terminal" BOOLEAN NOT NULL DEFAULT false,
    "requires_reference" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "receivable_account_id" TEXT,
    "clearing_account_id" TEXT,
    "fee_account_id" TEXT,

    CONSTRAINT "payment_method_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "order_item_id" TEXT,
    "payment_method" VARCHAR(30) NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "amount_received" DECIMAL(12,3),
    "change_given" DECIMAL(12,3),
    "foreign_currency_code" VARCHAR(3),
    "foreign_amount" DECIMAL(12,3),
    "exchange_rate" DECIMAL(12,6),
    "reference_number" VARCHAR(100),
    "terminal_id" VARCHAR(50),
    "approval_code" VARCHAR(50),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_id" TEXT NOT NULL,
    "processed_by" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "register_sessions" (
    "id" TEXT NOT NULL,
    "terminal_id" VARCHAR(50) NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_date" DATE NOT NULL,
    "opening_balance" DECIMAL(12,3) NOT NULL,
    "expected_cash" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "actual_closing_balance" DECIMAL(12,3),
    "discrepancy" DECIMAL(12,3),
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "total_cash_sales" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "total_card_sales" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "total_other_sales" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "total_drops" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "total_petty_cash" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "total_refunds" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "orders_count" INTEGER NOT NULL DEFAULT 0,
    "manager_approval_id" TEXT,
    "closing_notes" TEXT,

    CONSTRAINT "register_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "movement_type" VARCHAR(20) NOT NULL,
    "amount" DECIMAL(12,3) NOT NULL,
    "reason" VARCHAR(255) NOT NULL,
    "approved_by" TEXT,
    "movement_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denomination_counts" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "denomination" DECIMAL(10,2) NOT NULL,
    "count" INTEGER NOT NULL,
    "total" DECIMAL(12,3) NOT NULL,

    CONSTRAINT "denomination_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "loyalty_points" INTEGER NOT NULL DEFAULT 0,
    "loyalty_tier" VARCHAR(20) NOT NULL DEFAULT 'BRONZE',
    "total_spent" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "visits_count" INTEGER NOT NULL DEFAULT 0,
    "last_visit" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "custom_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "id" TEXT NOT NULL,
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "tax_number" VARCHAR(50) NOT NULL,
    "tax_rate" DECIMAL(5,4) NOT NULL,
    "service_charge" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'SAR',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Riyadh',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'ar-SA',
    "address" TEXT,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "logo" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(50) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "pin" VARCHAR(10),
    "name_ar" VARCHAR(255) NOT NULL,
    "name_en" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "role_id" TEXT,
    "role" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 5,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "module" VARCHAR(50) NOT NULL,
    "section" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" TEXT NOT NULL,
    "permission_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "authentication_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "method" VARCHAR(20) NOT NULL,
    "success" BOOLEAN NOT NULL,
    "failure_reason" VARCHAR(255),
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authentication_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_stations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "category_ids" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" VARCHAR(30) NOT NULL,
    "order_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_ticket_items" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "product_name_ar" VARCHAR(255) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "modifiers" JSONB,
    "status" VARCHAR(20) NOT NULL DEFAULT 'NEW',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_ticket_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "floors" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "floors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tables" (
    "id" TEXT NOT NULL,
    "number" VARCHAR(20) NOT NULL,
    "floor_id" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "section" VARCHAR(20) NOT NULL DEFAULT 'INDOOR',
    "shape" VARCHAR(20) NOT NULL DEFAULT 'SQUARE',
    "position_x" INTEGER,
    "position_y" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE',
    "current_order_id" TEXT,
    "waiter_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "table_reservations" (
    "id" TEXT NOT NULL,
    "table_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "customer_name" VARCHAR(255) NOT NULL,
    "customer_phone" VARCHAR(20) NOT NULL,
    "reserved_for" TIMESTAMP(3) NOT NULL,
    "party_size" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 120,
    "special_requests" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "table_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discounts" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "type" VARCHAR(20) NOT NULL,
    "value" DECIMAL(12,3) NOT NULL,
    "min_order_amount" DECIMAL(12,3),
    "max_discount" DECIMAL(12,3),
    "applicable_on" VARCHAR(20) NOT NULL DEFAULT 'ORDER',
    "category_ids" TEXT[],
    "product_ids" TEXT[],
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "start_time" VARCHAR(5),
    "end_time" VARCHAR(5),
    "days_of_week" INTEGER[],
    "is_corporate" BOOLEAN NOT NULL DEFAULT false,
    "corporate_ids" TEXT[],
    "requires_approval" BOOLEAN NOT NULL DEFAULT false,
    "approval_threshold" DECIMAL(12,3),
    "max_uses" INTEGER,
    "used_count" INTEGER NOT NULL DEFAULT 0,
    "max_uses_per_customer" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discount_usages" (
    "id" TEXT NOT NULL,
    "discount_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT,
    "discount_amount" DECIMAL(12,3) NOT NULL,
    "order_total" DECIMAL(12,3) NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "applied_by" TEXT NOT NULL,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "discount_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_zones" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "districts" TEXT[],
    "delivery_fee" DECIMAL(12,3) NOT NULL,
    "min_order_amount" DECIMAL(12,3),
    "free_delivery_threshold" DECIMAL(12,3),
    "estimated_time" INTEGER NOT NULL,
    "coordinates" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "license_number" VARCHAR(50) NOT NULL,
    "vehicle_type" VARCHAR(20) NOT NULL,
    "vehicle_plate" VARCHAR(20) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "last_location_update" TIMESTAMP(3),
    "total_deliveries" INTEGER NOT NULL DEFAULT 0,
    "rating" DECIMAL(3,2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deliveries" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "address_id" TEXT NOT NULL,
    "zone_id" TEXT,
    "driver_id" TEXT,
    "delivery_fee" DECIMAL(12,3) NOT NULL,
    "scheduled_for" TIMESTAMP(3),
    "picked_up_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "estimated_time" INTEGER,
    "tracking_notes" TEXT,
    "customer_rating" INTEGER,
    "customer_feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_invoices" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_hash" VARCHAR(255) NOT NULL,
    "previous_hash" VARCHAR(255),
    "qr_code" TEXT NOT NULL,
    "signed_xml" TEXT,
    "submission_status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "submitted_at" TIMESTAMP(3),
    "response_code" VARCHAR(20),
    "response_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" TEXT NOT NULL,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" VARCHAR(50),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_events" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "severity" VARCHAR(20) NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "name_ar" VARCHAR(255) NOT NULL,
    "query" JSONB NOT NULL,
    "parameters" JSONB,
    "schedule" VARCHAR(50),
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "role_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "format" VARCHAR(10) NOT NULL DEFAULT 'PDF',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_executions" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "parameters" JSONB,
    "file_path" VARCHAR(500),
    "file_size" INTEGER,
    "error" TEXT,
    "executed_by" TEXT NOT NULL,

    CONSTRAINT "report_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_settings" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "apply_to_products" BOOLEAN NOT NULL DEFAULT true,
    "apply_to_services" BOOLEAN NOT NULL DEFAULT true,
    "exempt_categories" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tax_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_terminals" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "name_ar" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "ip_address" VARCHAR(50),
    "mac_address" VARCHAR(50),
    "receipt_printer" JSONB,
    "kitchen_printer" JSONB,
    "label_printer" JSONB,
    "cash_drawer_port" VARCHAR(20),
    "customer_display" JSONB,
    "auto_open_drawer" BOOLEAN NOT NULL DEFAULT true,
    "print_receipt" BOOLEAN NOT NULL DEFAULT true,
    "print_kitchen" BOOLEAN NOT NULL DEFAULT true,
    "current_session_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_seen_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pos_terminals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "module_settings" (
    "id" TEXT NOT NULL,
    "module" VARCHAR(50) NOT NULL,
    "config" JSONB NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "module_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_compliance" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "uuid" VARCHAR(50) NOT NULL,
    "hash" VARCHAR(64) NOT NULL,
    "previous_hash" VARCHAR(64) NOT NULL,
    "signature" TEXT,
    "public_key" TEXT,
    "xml_content" TEXT NOT NULL,
    "qr_code_data" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3),
    "clearance_status" VARCHAR(20),
    "clearance_id" VARCHAR(100),
    "eta_uuid" VARCHAR(50),
    "eta_submitted_at" TIMESTAMP(3),
    "eta_status" VARCHAR(20),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_compliance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_settings" (
    "id" TEXT NOT NULL,
    "zatca_csid" VARCHAR(255),
    "zatca_secret" VARCHAR(255),
    "zatca_certificate" TEXT,
    "zatca_private_key" TEXT,
    "eta_client_id" VARCHAR(255),
    "eta_client_secret" VARCHAR(255),
    "eta_tax_id" VARCHAR(50),
    "country" VARCHAR(2) NOT NULL,
    "vat_number" VARCHAR(50) NOT NULL,
    "cr_number" VARCHAR(50) NOT NULL,
    "is_production" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_sort_order_idx" ON "categories"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_barcode_idx" ON "products"("barcode");

-- CreateIndex
CREATE INDEX "products_is_active_idx" ON "products"("is_active");

-- CreateIndex
CREATE INDEX "modifier_options_group_id_idx" ON "modifier_options"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_code_key" ON "warehouses"("code");

-- CreateIndex
CREATE INDEX "inventory_items_product_id_idx" ON "inventory_items"("product_id");

-- CreateIndex
CREATE INDEX "inventory_items_warehouse_id_idx" ON "inventory_items"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_items_product_id_warehouse_id_key" ON "inventory_items"("product_id", "warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_batches_inventory_item_id_idx" ON "inventory_batches"("inventory_item_id");

-- CreateIndex
CREATE INDEX "inventory_batches_received_date_idx" ON "inventory_batches"("received_date");

-- CreateIndex
CREATE INDEX "inventory_batches_expiry_date_idx" ON "inventory_batches"("expiry_date");

-- CreateIndex
CREATE INDEX "inventory_movements_product_id_idx" ON "inventory_movements"("product_id");

-- CreateIndex
CREATE INDEX "inventory_movements_warehouse_id_idx" ON "inventory_movements"("warehouse_id");

-- CreateIndex
CREATE INDEX "inventory_movements_batch_id_idx" ON "inventory_movements"("batch_id");

-- CreateIndex
CREATE INDEX "inventory_movements_type_idx" ON "inventory_movements"("type");

-- CreateIndex
CREATE INDEX "inventory_movements_reference_type_reference_id_idx" ON "inventory_movements"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "inventory_movements_created_at_idx" ON "inventory_movements"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_product_id_key" ON "recipes"("product_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipe_id_idx" ON "recipe_ingredients"("recipe_id");

-- CreateIndex
CREATE INDEX "recipe_ingredients_ingredient_product_id_idx" ON "recipe_ingredients"("ingredient_product_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_order_number_key" ON "sales_orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_zatca_uuid_key" ON "sales_orders"("zatca_uuid");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_eta_uuid_key" ON "sales_orders"("eta_uuid");

-- CreateIndex
CREATE INDEX "sales_orders_order_number_idx" ON "sales_orders"("order_number");

-- CreateIndex
CREATE INDEX "sales_orders_order_type_idx" ON "sales_orders"("order_type");

-- CreateIndex
CREATE INDEX "sales_orders_status_idx" ON "sales_orders"("status");

-- CreateIndex
CREATE INDEX "sales_orders_business_date_idx" ON "sales_orders"("business_date");

-- CreateIndex
CREATE INDEX "sales_orders_order_date_idx" ON "sales_orders"("order_date");

-- CreateIndex
CREATE INDEX "sales_orders_session_id_status_idx" ON "sales_orders"("session_id", "status");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_product_id_idx" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "order_items_status_idx" ON "order_items"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_method_configs_code_key" ON "payment_method_configs"("code");

-- CreateIndex
CREATE INDEX "payment_method_configs_code_idx" ON "payment_method_configs"("code");

-- CreateIndex
CREATE INDEX "payment_method_configs_is_active_idx" ON "payment_method_configs"("is_active");

-- CreateIndex
CREATE INDEX "payments_order_id_idx" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "payments_payment_method_idx" ON "payments"("payment_method");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_session_id_idx" ON "payments"("session_id");

-- CreateIndex
CREATE INDEX "payments_payment_date_idx" ON "payments"("payment_date");

-- CreateIndex
CREATE INDEX "register_sessions_terminal_id_idx" ON "register_sessions"("terminal_id");

-- CreateIndex
CREATE INDEX "register_sessions_user_id_idx" ON "register_sessions"("user_id");

-- CreateIndex
CREATE INDEX "register_sessions_business_date_idx" ON "register_sessions"("business_date");

-- CreateIndex
CREATE INDEX "register_sessions_status_idx" ON "register_sessions"("status");

-- CreateIndex
CREATE INDEX "cash_movements_session_id_idx" ON "cash_movements"("session_id");

-- CreateIndex
CREATE INDEX "cash_movements_movement_type_idx" ON "cash_movements"("movement_type");

-- CreateIndex
CREATE INDEX "denomination_counts_session_id_idx" ON "denomination_counts"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_phone_idx" ON "customers"("phone");

-- CreateIndex
CREATE INDEX "customers_email_idx" ON "customers"("email");

-- CreateIndex
CREATE INDEX "customers_loyalty_tier_idx" ON "customers"("loyalty_tier");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE INDEX "roles_level_idx" ON "roles"("level");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE INDEX "authentication_logs_user_id_idx" ON "authentication_logs"("user_id");

-- CreateIndex
CREATE INDEX "authentication_logs_created_at_idx" ON "authentication_logs"("created_at");

-- CreateIndex
CREATE INDEX "kitchen_stations_display_order_idx" ON "kitchen_stations"("display_order");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_tickets_ticket_number_key" ON "kitchen_tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "kitchen_tickets_station_id_idx" ON "kitchen_tickets"("station_id");

-- CreateIndex
CREATE INDEX "kitchen_tickets_status_idx" ON "kitchen_tickets"("status");

-- CreateIndex
CREATE INDEX "kitchen_tickets_order_id_idx" ON "kitchen_tickets"("order_id");

-- CreateIndex
CREATE INDEX "kitchen_ticket_items_ticket_id_idx" ON "kitchen_ticket_items"("ticket_id");

-- CreateIndex
CREATE INDEX "floors_display_order_idx" ON "floors"("display_order");

-- CreateIndex
CREATE INDEX "tables_floor_id_idx" ON "tables"("floor_id");

-- CreateIndex
CREATE INDEX "tables_status_idx" ON "tables"("status");

-- CreateIndex
CREATE UNIQUE INDEX "tables_floor_id_number_key" ON "tables"("floor_id", "number");

-- CreateIndex
CREATE INDEX "table_reservations_table_id_idx" ON "table_reservations"("table_id");

-- CreateIndex
CREATE INDEX "table_reservations_reserved_for_idx" ON "table_reservations"("reserved_for");

-- CreateIndex
CREATE INDEX "table_reservations_status_idx" ON "table_reservations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "discounts_code_key" ON "discounts"("code");

-- CreateIndex
CREATE INDEX "discounts_code_idx" ON "discounts"("code");

-- CreateIndex
CREATE INDEX "discounts_is_active_idx" ON "discounts"("is_active");

-- CreateIndex
CREATE INDEX "discount_usages_discount_id_idx" ON "discount_usages"("discount_id");

-- CreateIndex
CREATE INDEX "discount_usages_order_id_idx" ON "discount_usages"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_license_number_key" ON "drivers"("license_number");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_order_id_key" ON "deliveries"("order_id");

-- CreateIndex
CREATE INDEX "deliveries_status_idx" ON "deliveries"("status");

-- CreateIndex
CREATE INDEX "deliveries_driver_id_idx" ON "deliveries"("driver_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_invoices_order_id_key" ON "compliance_invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_invoices_invoice_number_key" ON "compliance_invoices"("invoice_number");

-- CreateIndex
CREATE INDEX "compliance_invoices_order_id_idx" ON "compliance_invoices"("order_id");

-- CreateIndex
CREATE INDEX "compliance_invoices_submission_status_idx" ON "compliance_invoices"("submission_status");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "compliance_events_type_idx" ON "compliance_events"("type");

-- CreateIndex
CREATE INDEX "compliance_events_severity_resolved_idx" ON "compliance_events"("severity", "resolved");

-- CreateIndex
CREATE INDEX "compliance_events_created_at_idx" ON "compliance_events"("created_at");

-- CreateIndex
CREATE INDEX "reports_type_idx" ON "reports"("type");

-- CreateIndex
CREATE INDEX "reports_is_active_idx" ON "reports"("is_active");

-- CreateIndex
CREATE INDEX "report_executions_report_id_idx" ON "report_executions"("report_id");

-- CreateIndex
CREATE INDEX "report_executions_status_idx" ON "report_executions"("status");

-- CreateIndex
CREATE INDEX "report_executions_started_at_idx" ON "report_executions"("started_at");

-- CreateIndex
CREATE INDEX "tax_settings_is_default_idx" ON "tax_settings"("is_default");

-- CreateIndex
CREATE UNIQUE INDEX "pos_terminals_code_key" ON "pos_terminals"("code");

-- CreateIndex
CREATE INDEX "pos_terminals_code_idx" ON "pos_terminals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "module_settings_module_key" ON "module_settings"("module");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_compliance_order_id_key" ON "invoice_compliance"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoice_compliance_uuid_key" ON "invoice_compliance"("uuid");

-- CreateIndex
CREATE INDEX "invoice_compliance_submitted_at_idx" ON "invoice_compliance"("submitted_at");

-- CreateIndex
CREATE INDEX "invoice_compliance_clearance_status_idx" ON "invoice_compliance"("clearance_status");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modifier_options" ADD CONSTRAINT "modifier_options_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "modifier_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_modifier_groups" ADD CONSTRAINT "product_modifier_groups_modifier_group_id_fkey" FOREIGN KEY ("modifier_group_id") REFERENCES "modifier_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_batches" ADD CONSTRAINT "inventory_batches_inventory_item_id_fkey" FOREIGN KEY ("inventory_item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_product_id_fkey" FOREIGN KEY ("ingredient_product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "register_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "register_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "denomination_counts" ADD CONSTRAINT "denomination_counts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "register_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentication_logs" ADD CONSTRAINT "authentication_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_tickets" ADD CONSTRAINT "kitchen_tickets_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "kitchen_stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_ticket_items" ADD CONSTRAINT "kitchen_ticket_items_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "kitchen_tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tables" ADD CONSTRAINT "tables_floor_id_fkey" FOREIGN KEY ("floor_id") REFERENCES "floors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "table_reservations" ADD CONSTRAINT "table_reservations_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "tables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discount_usages" ADD CONSTRAINT "discount_usages_discount_id_fkey" FOREIGN KEY ("discount_id") REFERENCES "discounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "delivery_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_executions" ADD CONSTRAINT "report_executions_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
