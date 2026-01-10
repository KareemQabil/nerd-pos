"chart_of_accounts": {
  "description": "Minimal chart of accounts for POS accounting bridge",
  "accounts": [
    {
      "account_code": "1000",
      "name_ar": "الأصول",
      "name_en": "Assets",
      "account_type": "ASSET",
      "parent_id": null,
      "is_system": true
    },
    {
      "account_code": "1100",
      "name_ar": "النقدية والبنوك",
      "name_en": "Cash and Banks",
      "account_type": "ASSET",
      "parent_code": "1000",
      "is_system": true
    },
    {
      "account_code": "1101",
      "name_ar": "الصندوق",
      "name_en": "Cash on Hand",
      "account_type": "ASSET",
      "parent_code": "1100",
      "is_system": true,
      "usage": "payment_method_config.receivable_account_id for CASH"
    },
    {
      "account_code": "1102",
      "name_ar": "حساب مدى/بطاقات - تحت التحصيل",
      "name_en": "Card Clearing Account",
      "account_type": "ASSET",
      "parent_code": "1100",
      "is_system": true,
      "usage": "payment_method_config.clearing_account_id for CARD payments"
    },
    {
      "account_code": "1103",
      "name_ar": "البنك",
      "name_en": "Bank Account",
      "account_type": "ASSET",
      "parent_code": "1100",
      "is_system": true,
      "usage": "payment_method_config.receivable_account_id for CARD (after settlement)"
    },
    {
      "account_code": "1200",
      "name_ar": "المخزون",
      "name_en": "Inventory",
      "account_type": "ASSET",
      "parent_code": "1000",
      "is_system": true,
      "usage": "Inventory valuation account"
    },
    {
      "account_code": "1300",
      "name_ar": "ذمم العملاء",
      "name_en": "Accounts Receivable",
      "account_type": "ASSET",
      "parent_code": "1000",
      "is_system": true,
      "usage": "payment_method_config.receivable_account_id for CREDIT"
    },
    {
      "account_code": "2000",
      "name_ar": "الخصوم",
      "name_en": "Liabilities",
      "account_type": "LIABILITY",
      "parent_id": null,
      "is_system": true
    },
    {
      "account_code": "2100",
      "name_ar": "ضريبة القيمة المضافة المستحقة",
      "name_en": "VAT Payable",
      "account_type": "LIABILITY",
      "parent_code": "2000",
      "is_system": true,
      "usage": "tax_settings.tax_account_id"
    },
    {
      "account_code": "2200",
      "name_ar": "ذمم الموردين",
      "name_en": "Accounts Payable",
      "account_type": "LIABILITY",
      "parent_code": "2000",
      "is_system": true,
      "usage": "supplier.payable_account_id"
    },
    {
      "account_code": "4000",
      "name_ar": "الإيرادات",
      "name_en": "Revenue",
      "account_type": "REVENUE",
      "parent_id": null,
      "is_system": true
    },
    {
      "account_code": "4100",
      "name_ar": "إيرادات المبيعات",
      "name_en": "Sales Revenue",
      "account_type": "REVENUE",
      "parent_code": "4000",
      "is_system": true,
      "usage": "product.income_account_id (default)"
    },
    {
      "account_code": "4200",
      "name_ar": "إيرادات رسوم الخدمة",
      "name_en": "Service Charge Revenue",
      "account_type": "REVENUE",
      "parent_code": "4000",
      "is_system": true
    },
    {
      "account_code": "4300",
      "name_ar": "إيرادات التوصيل",
      "name_en": "Delivery Revenue",
      "account_type": "REVENUE",
      "parent_code": "4000",
      "is_system": true
    },
    {
      "account_code": "5000",
      "name_ar": "المصروفات",
      "name_en": "Expenses",
      "account_type": "EXPENSE",
      "parent_id": null,
      "is_system": true
    },
    {
      "account_code": "5100",
      "name_ar": "تكلفة البضاعة المباعة",
      "name_en": "Cost of Goods Sold (COGS)",
      "account_type": "EXPENSE",
      "parent_code": "5000",
      "is_system": true,
      "usage": "product.expense_account_id (default)"
    },
    {
      "account_code": "5200",
      "name_ar": "عمولات البطاقات",
      "name_en": "Card Processing Fees",
      "account_type": "EXPENSE",
      "parent_code": "5000",
      "is_system": true,
      "usage": "payment_method_config.fee_account_id for CARD"
    },
    {
      "account_code": "5300",
      "name_ar": "خسائر النقص والفروقات",
      "name_en": "Cash Shortage/Overage",
      "account_type": "EXPENSE",
      "parent_code": "5000",
      "is_system": true,
      "usage": "Session discrepancy posting"
    }
  ],
  "account_linkages": {
    "description": "How seeded accounts link to other entities",
    "payment_methods": {
      "CASH": { "receivable_account": "1101" },
      "MADA": { "receivable_account": "1103", "clearing_account": "1102", "fee_account": "5200" },
      "VISA": { "receivable_account": "1103", "clearing_account": "1102", "fee_account": "5200" },
      "MASTERCARD": { "receivable_account": "1103", "clearing_account": "1102", "fee_account": "5200" },
      "CREDIT": { "receivable_account": "1300" }
    },
    "tax_settings": {
      "VAT_15": { "tax_account": "2100" },
      "VAT_14": { "tax_account": "2100" }
    },
    "products_default": {
      "income_account": "4100",
      "expense_account": "5100"
    }
  }
}


{
  "meta": {
    "document_name": "NerdPOS Complete System Specification",
    "version": "1.2.0",
    "created_date": "2026-01-08",
    "last_updated": "2026-01-08",
    "author": "Mohamed - NerdPOS",
    "target_markets": ["Egypt", "Saudi Arabia", "Gulf Region"],
    "deployment_model": "LICENSE_BASED",
    "deployment_note": "NOT SaaS - Each installation is standalone with one-time license",
    "revision_notes": {
      "v1.1.0": [
        "Added replenishment_method ENUM (BUY/MAKE_TO_ORDER/MAKE_TO_STOCK) replacing is_prepared boolean",
        "Added accounting keys (income_account_id, expense_account_id) to product",
        "Added tax_account_id to tax_settings",
        "Added receivable_account_id, clearing_account_id, fee_account_id to payment_method_config",
        "Added zatca_device_config table for CSID certificate storage (ENCRYPTED)",
        "Added update_channel and auto_update_enabled to store_settings",
        "Added Module 16: Accounting Placeholder (chart_of_accounts, journal_entry, journal_entry_line)",
        "Updated recipe_explosion algorithm to use replenishment_method logic",
        "Added decimal_handling section with Prisma/JS serialization guide and rounding rules"
      ],
      "v1.2.0": [
        "Added Module 17: Multi-Currency Extension (future) with currency_exchange_rate table",
        "Added foreign_currency_code, foreign_amount, exchange_rate to payment entity",
        "Added multi_currency_enabled flag to store_settings",
        "Added Module 18: Purchasing (supplier, purchase_order, goods_receipt)",
        "Added Module 19: Production Orders for MAKE_TO_STOCK items",
        "Added tip_amount and total_with_tip to sales_order",
        "Added complete Refund entity with refund_item for partial refunds",
        "Added Tips handling documentation",
        "Added sequence_generation section with sequence_config entity",
        "Added data_seeding section with all required seed data for installation"
      ]
    }
  },

  "business_model": {
    "licensing": {
      "type": "ONE_TIME_LICENSE",
      "deployment_options": ["ON_PREMISE", "CLOUD_HOSTED"],
      "support_model": "ANNUAL_MAINTENANCE_CONTRACT",
      "customization": "PER_CLIENT_CONFIGURATION"
    },
    "target_industries": {
      "primary": ["RESTAURANTS", "CAFES", "QUICK_SERVICE"],
      "secondary": ["RETAIL", "SUPERMARKET", "PHARMACY"],
      "tertiary": ["SERVICES", "SALON", "CLOUD_KITCHEN"]
    }
  },

  "technical_stack": {
    "backend": {
      "framework": "NestJS",
      "language": "TypeScript",
      "orm": "Prisma",
      "database": "PostgreSQL 14+",
      "api_style": "REST",
      "realtime": "WebSocket (Socket.io)"
    },
    "frontend": {
      "framework": "React 18+",
      "build_tool": "Vite",
      "language": "TypeScript",
      "state_management": {
        "server_state": "TanStack Query",
        "client_state": "Zustand"
      },
      "ui_library": "Shadcn/UI",
      "styling": "TailwindCSS",
      "calculations": "Decimal.js",
      "rtl_support": true
    },
    "offline": {
      "storage": "IndexedDB",
      "sync_strategy": "DELTA_SYNC",
      "queue_storage": "LOCAL_SQLITE",
      "conflict_resolution": "STRATEGY_PER_ENTITY"
    },
    
    "decimal_handling": {
      "CRITICAL_NOTE": "JavaScript/JSON cannot natively handle Decimal precision - MUST implement proper handling",
      "problem": "Prisma returns Decimal as Prisma.Decimal object, JSON.stringify converts to string or loses precision",
      "solution": {
        "backend": {
          "library": "decimal.js",
          "interceptor": "Create NestJS Transform Interceptor to serialize Decimals",
          "implementation": {
            "file": "src/common/interceptors/decimal-transform.interceptor.ts",
            "logic": "Recursively traverse response objects, convert Decimal instances to string",
            "example_code": [
              "import { Decimal } from 'decimal.js';",
              "",
              "function transformDecimals(obj: any): any {",
              "  if (obj === null || obj === undefined) return obj;",
              "  if (obj instanceof Decimal || obj.constructor?.name === 'Decimal') {",
              "    return obj.toString(); // Return as string for precision",
              "  }",
              "  if (Array.isArray(obj)) return obj.map(transformDecimals);",
              "  if (typeof obj === 'object') {",
              "    return Object.fromEntries(",
              "      Object.entries(obj).map(([k, v]) => [k, transformDecimals(v)])",
              "    );",
              "  }",
              "  return obj;",
              "}"
            ]
          }
        },
        "frontend": {
          "library": "decimal.js (already in stack)",
          "usage": {
            "receiving": "Parse string from API: new Decimal(response.price)",
            "calculations": "ALL financial math via Decimal.js methods",
            "display": "decimal.toFixed(3) for SAR, toFixed(2) for EGP",
            "sending": "Convert to string before API call: decimal.toString()"
          },
          "NEVER_DO": [
            "parseFloat(price) for calculations",
            "Number(price) for financial values",
            "price * quantity using native JS multiplication"
          ],
          "ALWAYS_DO": [
            "new Decimal(price).times(quantity).toDecimalPlaces(3)",
            "Store as Decimal, display as formatted string",
            "Compare using decimal.equals() not ==="
          ]
        },
        "prisma_config": {
          "note": "Prisma 5+ handles Decimal natively, but serialization is your responsibility",
          "schema_example": "price Decimal @db.Decimal(12, 3)"
        }
      },
      "rounding_rules": {
        "SAR": { "decimal_places": 2, "rounding": "ROUND_HALF_UP", "note": "Halala is 0.01" },
        "EGP": { "decimal_places": 2, "rounding": "ROUND_HALF_UP", "note": "Piaster is 0.01" },
        "internal_calculations": { "decimal_places": 3, "note": "Extra precision to avoid cumulative errors" },
        "tax_calculations": { "decimal_places": 4, "note": "Match ZATCA precision requirements" }
      }
    }
  },

  "data_architecture": {
    "philosophy": {
      "name": "SOLID_CORE_FLEXIBLE_EXTENSIONS",
      "ratio": "90/10",
      "description": "90% strongly typed columns, 10% JSONB for genuine extensibility"
    },
    
    "jsonb_usage_guidelines": {
      "when_to_use_jsonb": [
        "Industry-specific custom fields (prescription_number for pharmacy)",
        "Technical metadata (device_id, sync_status, app_version)",
        "User preferences (receipt_format, notification_settings)",
        "Audit trail details (action_context, before_after_state)"
      ],
      "when_NOT_to_use_jsonb": [
        "Core business fields (price, quantity, customer_name)",
        "Fields needed for foreign keys or relationships",
        "Fields that need database-level constraints",
        "Fields used heavily in WHERE clauses without GIN index",
        "Multi-tenancy (NOT applicable - we're License-based)"
      ],
      "ui_representation": {
        "approach": "PREDEFINED_FORMS_NOT_DYNAMIC",
        "explanation": "Since License-based, UI forms are built during development, not generated dynamically from JSONB schemas",
        "settings_pages": "Admin configures values through dedicated settings screens",
        "custom_fields_display": "Shown in 'Additional Info' sections, not primary forms"
      }
    },

    "standard_jsonb_columns": {
      "pattern": "Every major entity MAY have these JSONB columns where relevant",
      "columns": {
        "metadata": {
          "purpose": "Technical/system data",
          "examples": {
            "source": "POS_TERMINAL | MOBILE_APP | WEB | API",
            "device_id": "uuid",
            "app_version": "1.2.3",
            "sync_status": "SYNCED | PENDING | CONFLICT",
            "created_offline": true
          },
          "indexed": false,
          "user_visible": false
        },
        "custom_fields": {
          "purpose": "Industry-specific additional data",
          "examples": {
            "restaurant": { "waiter_name": "أحمد", "table_section": "SMOKING" },
            "pharmacy": { "prescription_number": "RX-2024-001", "doctor_name": "Dr. Ahmed" },
            "retail": { "warranty_months": 24, "serial_number": "SN123456" }
          },
          "indexed": "GIN index for frequently searched fields",
          "user_visible": true,
          "display_location": "Additional Info section"
        },
        "preferences": {
          "purpose": "User/entity preferences",
          "examples": {
            "receipt_copies": 2,
            "auto_print": true,
            "default_language": "ar"
          },
          "indexed": false,
          "user_visible": "Through Settings UI"
        }
      }
    }
  },

  "modules": {
    "01_products": {
      "priority": "CRITICAL",
      "status": "REQUIRED_FOR_MVP",
      "entities": {
        "category": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "parent_id": { "type": "UUID", "nullable": true, "note": "Self-reference for tree structure" },
            "name_ar": { "type": "VARCHAR(255)", "required": true },
            "name_en": { "type": "VARCHAR(255)", "required": true },
            "image_url": { "type": "VARCHAR(500)", "nullable": true },
            "sort_order": { "type": "INTEGER", "default": 0 },
            "is_active": { "type": "BOOLEAN", "default": true },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" },
            "updated_at": { "type": "TIMESTAMP" }
          },
          "indexes": ["parent_id", "sort_order"],
          "note": "Supports unlimited nesting via parent_id (Tree ID pattern)"
        },
        "product": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "sku": { "type": "VARCHAR(50)", "unique": true },
            "barcode": { "type": "VARCHAR(50)", "nullable": true, "indexed": true },
            "name_ar": { "type": "VARCHAR(255)", "required": true },
            "name_en": { "type": "VARCHAR(255)", "required": true },
            "description_ar": { "type": "TEXT", "nullable": true },
            "description_en": { "type": "TEXT", "nullable": true },
            "category_id": { "type": "UUID", "fk": "category.id", "required": true },
            "price": { "type": "DECIMAL(12,3)", "required": true },
            "cost": { "type": "DECIMAL(12,3)", "default": 0 },
            "tax_category": { "type": "ENUM", "values": ["STANDARD", "ZERO_RATED", "EXEMPT"], "default": "STANDARD" },
            "unit_of_measure": { "type": "VARCHAR(20)", "default": "PIECE" },
            "track_inventory": { "type": "BOOLEAN", "default": true },
            "allow_negative_stock": { "type": "BOOLEAN", "default": false },
            "has_modifiers": { "type": "BOOLEAN", "default": false },
            "replenishment_method": { 
              "type": "ENUM", 
              "values": ["BUY", "MAKE_TO_ORDER", "MAKE_TO_STOCK"],
              "default": "BUY",
              "note": "BUY=raw material, MAKE_TO_ORDER=explode BOM on sale, MAKE_TO_STOCK=deduct finished product only"
            },
            "kitchen_station_id": { "type": "UUID", "nullable": true, "fk": "kitchen_station.id" },
            "income_account_id": { "type": "UUID", "nullable": true, "fk": "chart_of_accounts.id", "note": "For accounting bridge" },
            "expense_account_id": { "type": "UUID", "nullable": true, "fk": "chart_of_accounts.id", "note": "COGS account" },
            "preparation_time_minutes": { "type": "INTEGER", "nullable": true },
            "image_url": { "type": "VARCHAR(500)", "nullable": true },
            "color_code": { "type": "VARCHAR(7)", "nullable": true, "note": "Hex color for text-only cards" },
            "is_active": { "type": "BOOLEAN", "default": true },
            "custom_fields": { "type": "JSONB", "nullable": true },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" },
            "updated_at": { "type": "TIMESTAMP" }
          },
          "indexes": ["category_id", "barcode", "is_active", "kitchen_station_id"],
          "gin_indexes": ["custom_fields"]
        },
        "modifier_group": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "name_ar": { "type": "VARCHAR(255)", "required": true },
            "name_en": { "type": "VARCHAR(255)", "required": true },
            "selection_type": { "type": "ENUM", "values": ["SINGLE", "MULTIPLE"], "required": true },
            "is_required": { "type": "BOOLEAN", "default": false },
            "min_selections": { "type": "INTEGER", "default": 0 },
            "max_selections": { "type": "INTEGER", "nullable": true },
            "sort_order": { "type": "INTEGER", "default": 0 },
            "is_active": { "type": "BOOLEAN", "default": true }
          }
        },
        "modifier_option": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "group_id": { "type": "UUID", "fk": "modifier_group.id", "required": true },
            "name_ar": { "type": "VARCHAR(255)", "required": true },
            "name_en": { "type": "VARCHAR(255)", "required": true },
            "price": { "type": "DECIMAL(12,3)", "default": 0 },
            "is_default": { "type": "BOOLEAN", "default": false },
            "sort_order": { "type": "INTEGER", "default": 0 },
            "is_active": { "type": "BOOLEAN", "default": true }
          },
          "indexes": ["group_id"]
        },
        "product_modifier_group": {
          "columns": {
            "product_id": { "type": "UUID", "fk": "product.id" },
            "modifier_group_id": { "type": "UUID", "fk": "modifier_group.id" }
          },
          "primary_key": ["product_id", "modifier_group_id"],
          "note": "Many-to-many junction table"
        }
      }
    },

    "02_inventory": {
      "priority": "CRITICAL",
      "status": "REQUIRED_FOR_MVP",
      "configuration": {
        "valuation_method": {
          "type": "ENUM",
          "values": ["FIFO", "WEIGHTED_AVERAGE"],
          "default": "FIFO",
          "note": "FIFO is standard for F&B, WEIGHTED_AVERAGE for retail"
        },
        "negative_stock_behavior": {
          "type": "ENUM",
          "values": ["BLOCK_SALE", "ALLOW_WITH_ALERT", "ALLOW_SILENT"],
          "default": "BLOCK_SALE"
        },
        "reservation_expiry_minutes": {
          "type": "INTEGER",
          "default": 30
        }
      },
      "entities": {
        "warehouse": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "code": { "type": "VARCHAR(20)", "unique": true },
            "name_ar": { "type": "VARCHAR(255)", "required": true },
            "name_en": { "type": "VARCHAR(255)", "required": true },
            "is_default": { "type": "BOOLEAN", "default": false },
            "is_active": { "type": "BOOLEAN", "default": true }
          }
        },
        "inventory_item": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "product_id": { "type": "UUID", "fk": "product.id", "required": true },
            "warehouse_id": { "type": "UUID", "fk": "warehouse.id", "required": true },
            "quantity_on_hand": { "type": "DECIMAL(12,3)", "default": 0 },
            "quantity_reserved": { "type": "DECIMAL(12,3)", "default": 0 },
            "quantity_available": { 
              "type": "DECIMAL(12,3)", 
              "computed": "quantity_on_hand - quantity_reserved",
              "note": "Generated column or calculated in application"
            },
            "minimum_level": { "type": "DECIMAL(12,3)", "default": 0 },
            "maximum_level": { "type": "DECIMAL(12,3)", "nullable": true },
            "reorder_point": { "type": "DECIMAL(12,3)", "default": 0 },
            "average_cost": { "type": "DECIMAL(12,3)", "default": 0 }
          },
          "unique_constraint": ["product_id", "warehouse_id"],
          "indexes": ["product_id", "warehouse_id"]
        },
        "inventory_batch": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "inventory_item_id": { "type": "UUID", "fk": "inventory_item.id", "required": true },
            "batch_number": { "type": "VARCHAR(50)", "nullable": true },
            "received_date": { "type": "TIMESTAMP", "required": true },
            "expiry_date": { "type": "DATE", "nullable": true },
            "quantity_received": { "type": "DECIMAL(12,3)", "required": true },
            "quantity_remaining": { "type": "DECIMAL(12,3)", "required": true },
            "cost_per_unit": { "type": "DECIMAL(12,3)", "required": true },
            "supplier_id": { "type": "UUID", "nullable": true, "fk": "partner.id" },
            "is_virtual_negative": { "type": "BOOLEAN", "default": false, "note": "True for oversold virtual batches" }
          },
          "indexes": ["inventory_item_id", "received_date", "expiry_date"]
        },
        "recipe": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "product_id": { "type": "UUID", "fk": "product.id", "unique": true, "note": "The finished product" },
            "yield_quantity": { "type": "DECIMAL(12,3)", "default": 1 },
            "yield_unit": { "type": "VARCHAR(20)", "default": "PIECE" },
            "is_active": { "type": "BOOLEAN", "default": true }
          }
        },
        "recipe_ingredient": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "recipe_id": { "type": "UUID", "fk": "recipe.id", "required": true },
            "ingredient_product_id": { "type": "UUID", "fk": "product.id", "required": true },
            "quantity_required": { "type": "DECIMAL(12,3)", "required": true },
            "unit": { "type": "VARCHAR(20)", "required": true },
            "is_prepared": { "type": "BOOLEAN", "default": false, "note": "True if ingredient itself has a recipe (multi-level BOM)" }
          },
          "indexes": ["recipe_id", "ingredient_product_id"]
        },
        "stock_movement": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "movement_type": { 
              "type": "ENUM", 
              "values": ["SALE", "PURCHASE", "ADJUSTMENT_IN", "ADJUSTMENT_OUT", "TRANSFER_IN", "TRANSFER_OUT", "RETURN", "WASTE", "PRODUCTION_IN", "PRODUCTION_OUT"],
              "required": true 
            },
            "reference_type": { "type": "VARCHAR(50)", "nullable": true, "note": "sales_order, purchase_order, etc." },
            "reference_id": { "type": "UUID", "nullable": true },
            "product_id": { "type": "UUID", "fk": "product.id", "required": true },
            "batch_id": { "type": "UUID", "fk": "inventory_batch.id", "nullable": true },
            "warehouse_id": { "type": "UUID", "fk": "warehouse.id", "required": true },
            "quantity": { "type": "DECIMAL(12,3)", "required": true, "note": "Positive for IN, Negative for OUT" },
            "unit_cost": { "type": "DECIMAL(12,3)", "default": 0 },
            "total_cost": { "type": "DECIMAL(12,3)", "default": 0 },
            "is_prepared_product": { "type": "BOOLEAN", "default": false },
            "movement_date": { "type": "TIMESTAMP", "default": "NOW()" },
            "user_id": { "type": "UUID", "fk": "user.id", "required": true },
            "notes": { "type": "TEXT", "nullable": true },
            "metadata": { "type": "JSONB", "nullable": true }
          },
          "indexes": ["movement_type", "reference_type", "reference_id", "product_id", "movement_date"]
        },
        "stock_reservation": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "order_id": { "type": "UUID", "fk": "sales_order.id", "required": true },
            "product_id": { "type": "UUID", "fk": "product.id", "required": true },
            "warehouse_id": { "type": "UUID", "fk": "warehouse.id", "required": true },
            "quantity": { "type": "DECIMAL(12,3)", "required": true },
            "status": { 
              "type": "ENUM", 
              "values": ["RESERVED", "COMMITTED", "RELEASED", "EXPIRED"],
              "default": "RESERVED"
            },
            "reserved_at": { "type": "TIMESTAMP", "default": "NOW()" },
            "expires_at": { "type": "TIMESTAMP", "required": true },
            "committed_at": { "type": "TIMESTAMP", "nullable": true },
            "released_at": { "type": "TIMESTAMP", "nullable": true }
          },
          "indexes": ["order_id", "product_id", "status", "expires_at"]
        },
        "waste_entry": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "product_id": { "type": "UUID", "fk": "product.id", "required": true },
            "warehouse_id": { "type": "UUID", "fk": "warehouse.id", "required": true },
            "quantity": { "type": "DECIMAL(12,3)", "required": true },
            "reason": { 
              "type": "ENUM", 
              "values": ["SPOILAGE", "EXPIRED", "DAMAGED", "MISTAKE", "POST_FIRE_VOID", "QUALITY_ISSUE", "OTHER"],
              "required": true 
            },
            "reference_type": { "type": "VARCHAR(50)", "nullable": true },
            "reference_id": { "type": "UUID", "nullable": true },
            "unit_cost": { "type": "DECIMAL(12,3)", "default": 0 },
            "total_cost": { "type": "DECIMAL(12,3)", "default": 0 },
            "user_id": { "type": "UUID", "fk": "user.id", "required": true },
            "notes": { "type": "TEXT", "nullable": true },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" }
          },
          "indexes": ["product_id", "reason", "created_at"]
        }
      },
      "algorithms": {
        "fifo_deduction": {
          "description": "First-In-First-Out inventory deduction",
          "steps": [
            "1. Get batches for product/warehouse ORDER BY received_date ASC",
            "2. Iterate through batches, deducting from oldest first",
            "3. Create stock_movement for each batch consumed",
            "4. Calculate weighted average cost (COGS)",
            "5. If insufficient stock and allow_negative: create virtual negative batch",
            "6. If insufficient and !allow_negative: throw INV_002 error"
          ]
        },
        "recipe_explosion": {
          "description": "Multi-level BOM explosion based on replenishment_method",
          "logic": {
            "BUY": "Raw material - deduct directly using FIFO, no recipe",
            "MAKE_TO_ORDER": "Explode recipe recursively on every sale - deduct raw materials",
            "MAKE_TO_STOCK": "Deduct finished product only - assumes production already done via Production module"
          },
          "steps": [
            "1. Check product.replenishment_method",
            "2. If BUY: Direct FIFO deduction, STOP",
            "3. If MAKE_TO_STOCK: Direct FIFO deduction of finished product, STOP",
            "4. If MAKE_TO_ORDER:",
            "   - Get recipe and recipe_ingredients",
            "   - For each ingredient: RECURSIVE call based on ingredient's replenishment_method",
            "   - Aggregate duplicate raw materials",
            "   - Deduct all using FIFO",
            "   - Create summary stock_movement with metadata containing breakdown"
          ],
          "production_module_note": "For MAKE_TO_STOCK items, a separate Production Order must be created to transform raw materials into finished product"
        },
        "reservation_lifecycle": {
          "states": {
            "RESERVED": "Soft hold when item added to cart (POS)",
            "COMMITTED": "Hard deduction when order fired to kitchen",
            "RELEASED": "Returned to available (void, cancel, expiry)",
            "EXPIRED": "Auto-released after reservation_expiry_minutes"
          },
          "transitions": [
            "AVAILABLE → RESERVED (add to cart)",
            "RESERVED → COMMITTED (fire to kitchen / complete sale)",
            "RESERVED → RELEASED (void before fire / cart cleared)",
            "RESERVED → EXPIRED (timeout - cron job)"
          ]
        }
      }
    },

    "03_sales": {
      "priority": "CRITICAL",
      "status": "REQUIRED_FOR_MVP",
      "configuration": {
        "order_types": {
          "values": [
            { "code": "TAKEAWAY", "name_ar": "تيك أواي", "name_en": "Takeaway", "service_charge": false, "default": true },
            { "code": "DINE_IN", "name_ar": "محلي", "name_en": "Dine In", "service_charge": true },
            { "code": "DELIVERY", "name_ar": "توصيل", "name_en": "Delivery", "delivery_charge": true },
            { "code": "PICKUP", "name_ar": "استلام", "name_en": "Pickup", "service_charge": false },
            { "code": "AGGREGATOR_TALABAT", "name_ar": "طلبات", "name_en": "Talabat", "fixed_delivery": 50 },
            { "code": "AGGREGATOR_MARSOOL", "name_ar": "مرسول", "name_en": "Marsool", "fixed_delivery": 50 },
            { "code": "AGGREGATOR_INSTASHOP", "name_ar": "إنستاشوب", "name_en": "Instashop", "fixed_delivery": 50 }
          ]
        }
      },
      "entities": {
        "sales_order": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "order_number": { "type": "VARCHAR(30)", "unique": true, "note": "Sequential per day: ORD-20260108-001" },
            "order_type": { "type": "VARCHAR(30)", "required": true },
            "order_date": { "type": "TIMESTAMP", "default": "NOW()" },
            "business_date": { "type": "DATE", "required": true, "note": "May differ from order_date for late-night orders" },
            "customer_id": { "type": "UUID", "nullable": true, "fk": "customer.id" },
            "table_id": { "type": "UUID", "nullable": true, "fk": "table.id" },
            "customer_count": { "type": "INTEGER", "nullable": true, "note": "For DINE_IN" },
            "item_subtotal": { "type": "DECIMAL(12,3)", "default": 0 },
            "service_charge_rate": { "type": "DECIMAL(5,4)", "default": 0 },
            "service_charge_amount": { "type": "DECIMAL(12,3)", "default": 0 },
            "delivery_charge": { "type": "DECIMAL(12,3)", "default": 0 },
            "subtotal_before_tax": { "type": "DECIMAL(12,3)", "default": 0 },
            "tax_rate": { "type": "DECIMAL(5,4)", "required": true },
            "tax_amount": { "type": "DECIMAL(12,3)", "default": 0 },
            "discount_id": { "type": "UUID", "nullable": true, "fk": "discount.id" },
            "discount_amount": { "type": "DECIMAL(12,3)", "default": 0 },
            "grand_total": { "type": "DECIMAL(12,3)", "default": 0 },
            "tip_amount": { "type": "DECIMAL(12,3)", "default": 0, "note": "Gratuity - added at payment, NOT part of grand_total calculation" },
            "total_with_tip": { "type": "DECIMAL(12,3)", "default": 0, "note": "grand_total + tip_amount" },
            "status": { 
              "type": "ENUM", 
              "values": ["DRAFT", "SAVED", "FIRED", "PAID", "COMPLETED", "VOID", "PARKED"],
              "default": "DRAFT"
            },
            "payment_status": { 
              "type": "ENUM", 
              "values": ["PENDING", "PARTIAL", "PAID", "REFUNDED"],
              "default": "PENDING"
            },
            "session_id": { "type": "UUID", "fk": "register_session.id", "required": true },
            "cashier_id": { "type": "UUID", "fk": "user.id", "required": true },
            "warehouse_id": { "type": "UUID", "fk": "warehouse.id", "required": true },
            "notes": { "type": "TEXT", "nullable": true },
            "zatca_uuid": { "type": "VARCHAR(50)", "nullable": true, "unique": true },
            "zatca_hash": { "type": "VARCHAR(100)", "nullable": true },
            "zatca_previous_hash": { "type": "VARCHAR(100)", "nullable": true },
            "qr_code": { "type": "TEXT", "nullable": true },
            "eta_uuid": { "type": "VARCHAR(50)", "nullable": true, "unique": true },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" },
            "updated_at": { "type": "TIMESTAMP" },
            "fired_at": { "type": "TIMESTAMP", "nullable": true },
            "paid_at": { "type": "TIMESTAMP", "nullable": true },
            "completed_at": { "type": "TIMESTAMP", "nullable": true },
            "voided_at": { "type": "TIMESTAMP", "nullable": true },
            "voided_by": { "type": "UUID", "nullable": true, "fk": "user.id" },
            "void_reason": { "type": "TEXT", "nullable": true },
            "metadata": { "type": "JSONB", "nullable": true }
          },
          "indexes": ["order_number", "order_type", "status", "session_id", "customer_id", "business_date", "order_date"]
        },
        "order_item": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "order_id": { "type": "UUID", "fk": "sales_order.id", "required": true },
            "product_id": { "type": "UUID", "fk": "product.id", "required": true },
            "product_name_ar": { "type": "VARCHAR(255)", "note": "Snapshot at time of sale" },
            "product_name_en": { "type": "VARCHAR(255)" },
            "quantity": { "type": "DECIMAL(12,3)", "required": true },
            "unit_price": { "type": "DECIMAL(12,3)", "required": true },
            "modifiers_amount": { "type": "DECIMAL(12,3)", "default": 0 },
            "line_total": { "type": "DECIMAL(12,3)", "required": true },
            "cost_per_unit": { "type": "DECIMAL(12,3)", "default": 0 },
            "total_cost": { "type": "DECIMAL(12,3)", "default": 0 },
            "notes": { "type": "TEXT", "nullable": true },
            "status": { 
              "type": "ENUM", 
              "values": ["NEW", "FIRED", "PREPARING", "READY", "SERVED", "VOIDED"],
              "default": "NEW"
            },
            "kitchen_station_id": { "type": "UUID", "nullable": true, "fk": "kitchen_station.id" },
            "voided_at": { "type": "TIMESTAMP", "nullable": true },
            "voided_by": { "type": "UUID", "nullable": true, "fk": "user.id" },
            "void_reason": { "type": "VARCHAR(255)", "nullable": true },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" }
          },
          "indexes": ["order_id", "product_id", "status"]
        },
        "order_item_modifier": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "order_item_id": { "type": "UUID", "fk": "order_item.id", "required": true },
            "modifier_option_id": { "type": "UUID", "fk": "modifier_option.id", "required": true },
            "modifier_group_name": { "type": "VARCHAR(255)" },
            "modifier_option_name": { "type": "VARCHAR(255)" },
            "price": { "type": "DECIMAL(12,3)", "default": 0 }
          },
          "indexes": ["order_item_id"]
        }
      },
      "workflows": {
        "order_status_transitions": {
          "DRAFT": { "can_go_to": ["SAVED", "FIRED", "VOID", "PARKED"], "stock_state": "NOT_RESERVED" },
          "SAVED": { "can_go_to": ["FIRED", "VOID"], "stock_state": "RESERVED" },
          "PARKED": { "can_go_to": ["DRAFT", "VOID"], "stock_state": "NOT_RESERVED" },
          "FIRED": { "can_go_to": ["PAID", "VOID"], "stock_state": "COMMITTED" },
          "PAID": { "can_go_to": ["COMPLETED"], "stock_state": "COMMITTED" },
          "COMPLETED": { "can_go_to": [], "stock_state": "COMMITTED", "terminal": true },
          "VOID": { "can_go_to": [], "stock_state": "RELEASED_OR_WASTED", "terminal": true }
        },
        "koshary_scenario": {
          "description": "Edit modifiers after adding item to cart",
          "implementation": [
            "1. Item added to cart (status: NEW)",
            "2. Customer requests modifier change",
            "3. Tap on item in cart → ModifierEditor opens",
            "4. Add/Remove modifiers",
            "5. Price recalculated",
            "6. Same line updated (no duplicate)",
            "7. Allowed until status = FIRED"
          ],
          "blocked_after": ["FIRED", "PREPARING", "READY", "SERVED"]
        }
      }
    },

    "04_payments": {
      "priority": "CRITICAL",
      "status": "REQUIRED_FOR_MVP",
      "configuration": {
        "payment_methods": [
          { "code": "CASH", "name_ar": "كاش", "name_en": "Cash", "requires_terminal": false },
          { "code": "CARD", "name_ar": "بطاقة", "name_en": "Card", "requires_terminal": true },
          { "code": "MADA", "name_ar": "مدى", "name_en": "Mada", "requires_terminal": true },
          { "code": "VISA", "name_ar": "فيزا", "name_en": "Visa", "requires_terminal": true },
          { "code": "MASTERCARD", "name_ar": "ماستركارد", "name_en": "Mastercard", "requires_terminal": true },
          { "code": "LOYALTY_POINTS", "name_ar": "نقاط الولاء", "name_en": "Loyalty Points", "requires_terminal": false },
          { "code": "CREDIT_CUSTOMER", "name_ar": "آجل", "name_en": "Customer Credit", "requires_terminal": false }
        ]
      },
      "entities": {
        "payment_method_config": {
          "description": "Configurable payment methods with accounting mapping",
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "code": { "type": "VARCHAR(30)", "unique": true, "required": true },
            "name_ar": { "type": "VARCHAR(100)", "required": true },
            "name_en": { "type": "VARCHAR(100)", "required": true },
            "type": { "type": "ENUM", "values": ["CASH", "CARD", "DIGITAL", "CREDIT", "OTHER"], "required": true },
            "requires_terminal": { "type": "BOOLEAN", "default": false },
            "requires_reference": { "type": "BOOLEAN", "default": false },
            "is_active": { "type": "BOOLEAN", "default": true },
            "sort_order": { "type": "INTEGER", "default": 0 },
            "receivable_account_id": { "type": "UUID", "nullable": true, "fk": "chart_of_accounts.id", "note": "For accounting bridge" },
            "clearing_account_id": { "type": "UUID", "nullable": true, "fk": "chart_of_accounts.id" },
            "fee_account_id": { "type": "UUID", "nullable": true, "fk": "chart_of_accounts.id", "note": "For card processing fees" }
          },
          "indexes": ["code", "is_active"]
        },
        "payment": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "order_id": { "type": "UUID", "fk": "sales_order.id", "required": true },
            "order_item_id": { "type": "UUID", "nullable": true, "fk": "order_item.id", "note": "For split by item" },
            "payment_method": { "type": "VARCHAR(30)", "required": true },
            "amount": { "type": "DECIMAL(12,3)", "required": true, "note": "Amount in BASE currency" },
            "amount_received": { "type": "DECIMAL(12,3)", "nullable": true, "note": "For CASH" },
            "change_given": { "type": "DECIMAL(12,3)", "nullable": true, "note": "For CASH" },
            "foreign_currency_code": { "type": "VARCHAR(3)", "nullable": true, "note": "FUTURE: USD, EUR if paid in foreign currency" },
            "foreign_amount": { "type": "DECIMAL(12,3)", "nullable": true, "note": "FUTURE: Amount customer paid in foreign currency" },
            "exchange_rate": { "type": "DECIMAL(12,6)", "nullable": true, "note": "FUTURE: Rate at time of payment (foreign_amount × rate = amount)" },
            "reference_number": { "type": "VARCHAR(100)", "nullable": true, "note": "Terminal reference" },
            "terminal_id": { "type": "VARCHAR(50)", "nullable": true },
            "approval_code": { "type": "VARCHAR(50)", "nullable": true },
            "status": { 
              "type": "ENUM", 
              "values": ["PENDING", "APPROVED", "DECLINED", "REFUNDED", "CANCELLED"],
              "default": "PENDING"
            },
            "payment_date": { "type": "TIMESTAMP", "default": "NOW()" },
            "session_id": { "type": "UUID", "fk": "register_session.id", "required": true },
            "processed_by": { "type": "UUID", "fk": "user.id", "required": true },
            "metadata": { "type": "JSONB", "nullable": true }
          },
          "indexes": ["order_id", "payment_method", "status", "session_id", "payment_date"]
        }
      },
      "features": {
        "split_payment_by_amount": {
          "description": "Multiple payment methods for single order",
          "example": "200 CASH + 250 CARD = 450 total",
          "validation": "SUM(payments.amount) >= order.grand_total",
          "tolerance": 0.001
        },
        "split_payment_by_item": {
          "description": "Each item paid separately",
          "example": "Burger (CASH), Salad (CARD)",
          "implementation": "payment.order_item_id links to specific item"
        },
        "tips": {
          "description": "Gratuity/tip handling",
          "implementation": {
            "storage": "Stored in sales_order.tip_amount",
            "timing": "Added at payment time, AFTER grand_total calculation",
            "distribution": "Tip pooling rules configured in settings",
            "reporting": "Separate from sales revenue in reports"
          }
        },
        "refunds": {
          "entity": {
            "refund": {
              "columns": {
                "id": { "type": "UUID", "primary": true },
                "refund_number": { "type": "VARCHAR(30)", "unique": true },
                "original_order_id": { "type": "UUID", "fk": "sales_order.id", "required": true },
                "original_payment_id": { "type": "UUID", "fk": "payment.id", "nullable": true },
                "refund_type": { 
                  "type": "ENUM", 
                  "values": ["FULL", "PARTIAL", "ITEM_RETURN"],
                  "required": true 
                },
                "amount": { "type": "DECIMAL(12,3)", "required": true },
                "refund_method": { "type": "VARCHAR(30)", "required": true, "note": "CASH, CARD_REVERSAL, CREDIT_TO_CUSTOMER" },
                "reason": { 
                  "type": "ENUM", 
                  "values": ["CUSTOMER_REQUEST", "WRONG_ORDER", "QUALITY_ISSUE", "PRICE_ERROR", "OTHER"],
                  "required": true 
                },
                "notes": { "type": "TEXT", "nullable": true },
                "status": { 
                  "type": "ENUM", 
                  "values": ["PENDING", "APPROVED", "COMPLETED", "REJECTED"],
                  "default": "PENDING"
                },
                "requires_manager": { "type": "BOOLEAN", "default": true },
                "authorized_by": { "type": "UUID", "nullable": true, "fk": "user.id" },
                "processed_by": { "type": "UUID", "fk": "user.id", "required": true },
                "session_id": { "type": "UUID", "fk": "register_session.id", "required": true },
                "inventory_returned": { "type": "BOOLEAN", "default": false, "note": "Whether items returned to stock" },
                "created_at": { "type": "TIMESTAMP", "default": "NOW()" }
              },
              "indexes": ["original_order_id", "refund_type", "status", "session_id", "created_at"]
            },
            "refund_item": {
              "description": "For PARTIAL and ITEM_RETURN refunds",
              "columns": {
                "id": { "type": "UUID", "primary": true },
                "refund_id": { "type": "UUID", "fk": "refund.id", "required": true },
                "original_order_item_id": { "type": "UUID", "fk": "order_item.id", "required": true },
                "quantity_returned": { "type": "DECIMAL(12,3)", "required": true },
                "amount": { "type": "DECIMAL(12,3)", "required": true },
                "return_to_inventory": { "type": "BOOLEAN", "default": false }
              },
              "indexes": ["refund_id", "original_order_item_id"]
            }
          },
          "business_rules": {
            "approval_required": "All refunds require manager authorization",
            "time_limit": "Refund only within same business_date (configurable)",
            "inventory_handling": {
              "food_items": "Usually NOT returned to inventory (waste)",
              "retail_items": "Can be returned if unopened",
              "config_flag": "Per-category refund_returnable_to_inventory"
            },
            "card_refunds": "Must go back to same card (terminal reversal)",
            "zatca_note": "Refund generates Credit Note invoice with negative values"
          }
        }
      }
    },

    "05_sessions": {
      "priority": "CRITICAL",
      "status": "REQUIRED_FOR_MVP",
      "configuration": {
        "blind_close_enabled": { "type": "BOOLEAN", "default": true },
        "discrepancy_threshold": { "type": "DECIMAL", "default": 5.00 },
        "require_denomination_count": { "type": "BOOLEAN", "default": true },
        "allow_multiple_open_sessions": { "type": "BOOLEAN", "default": false }
      },
      "entities": {
        "terminal": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "code": { "type": "VARCHAR(20)", "unique": true },
            "name": { "type": "VARCHAR(100)", "required": true },
            "location": { "type": "VARCHAR(255)", "nullable": true },
            "receipt_printer_ip": { "type": "VARCHAR(50)", "nullable": true },
            "is_active": { "type": "BOOLEAN", "default": true }
          }
        },
        "register_session": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "session_number": { "type": "VARCHAR(30)", "unique": true },
            "terminal_id": { "type": "UUID", "fk": "terminal.id", "required": true },
            "user_id": { "type": "UUID", "fk": "user.id", "required": true },
            "business_date": { "type": "DATE", "required": true },
            "opening_time": { "type": "TIMESTAMP", "default": "NOW()" },
            "closing_time": { "type": "TIMESTAMP", "nullable": true },
            "opening_balance": { "type": "DECIMAL(12,3)", "default": 0 },
            "expected_cash": { "type": "DECIMAL(12,3)", "default": 0, "note": "Calculated, HIDDEN from cashier" },
            "expected_card": { "type": "DECIMAL(12,3)", "default": 0 },
            "actual_closing_balance": { "type": "DECIMAL(12,3)", "nullable": true },
            "cash_discrepancy": { "type": "DECIMAL(12,3)", "nullable": true },
            "status": { 
              "type": "ENUM", 
              "values": ["OPEN", "CLOSING", "CLOSED"],
              "default": "OPEN"
            },
            "total_cash_sales": { "type": "DECIMAL(12,3)", "default": 0 },
            "total_card_sales": { "type": "DECIMAL(12,3)", "default": 0 },
            "total_other_sales": { "type": "DECIMAL(12,3)", "default": 0 },
            "total_drops": { "type": "DECIMAL(12,3)", "default": 0 },
            "total_petty_cash": { "type": "DECIMAL(12,3)", "default": 0 },
            "total_refunds": { "type": "DECIMAL(12,3)", "default": 0 },
            "orders_count": { "type": "INTEGER", "default": 0 },
            "manager_approval_id": { "type": "UUID", "nullable": true, "fk": "manager_authorization.id" },
            "closing_notes": { "type": "TEXT", "nullable": true }
          },
          "indexes": ["terminal_id", "user_id", "business_date", "status"]
        },
        "cash_movement": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "session_id": { "type": "UUID", "fk": "register_session.id", "required": true },
            "movement_type": { 
              "type": "ENUM", 
              "values": ["PAY_IN", "PAY_OUT", "DROP_TO_SAFE", "REFUND"],
              "required": true 
            },
            "amount": { "type": "DECIMAL(12,3)", "required": true },
            "reason": { "type": "VARCHAR(255)", "required": true },
            "approved_by": { "type": "UUID", "nullable": true, "fk": "user.id" },
            "movement_time": { "type": "TIMESTAMP", "default": "NOW()" }
          },
          "indexes": ["session_id", "movement_type"]
        },
        "denomination_count": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "session_id": { "type": "UUID", "fk": "register_session.id", "required": true },
            "denomination": { "type": "DECIMAL(10,2)", "required": true, "note": "200, 100, 50, 20, 10, 5, 1, 0.50, 0.25" },
            "count": { "type": "INTEGER", "required": true },
            "total": { "type": "DECIMAL(12,3)", "computed": "denomination * count" }
          },
          "indexes": ["session_id"]
        }
      },
      "workflows": {
        "blind_close": {
          "description": "Cashier counts cash without knowing expected amount",
          "steps": [
            "1. Cashier clicks 'Close Session'",
            "2. System calculates expected_cash (HIDDEN from UI)",
            "3. Denomination counter UI shown",
            "4. Cashier enters count for each denomination",
            "5. System calculates actual_closing_balance",
            "6. System calculates discrepancy",
            "7. If discrepancy > threshold: require manager PIN + notes",
            "8. Session closed",
            "9. Cashier sees 'Session Closed ✓' (NO discrepancy shown)",
            "10. Manager report shows full discrepancy details"
          ],
          "formula": {
            "expected_cash": "opening_balance + total_cash_sales - total_drops - total_petty_cash + total_refunds",
            "discrepancy": "actual_closing_balance - expected_cash"
          }
        }
      }
    },

    "06_tables": {
      "priority": "HIGH",
      "status": "REQUIRED_FOR_RESTAURANTS",
      "entities": {
        "floor": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "name_ar": { "type": "VARCHAR(100)", "required": true },
            "name_en": { "type": "VARCHAR(100)", "required": true },
            "sort_order": { "type": "INTEGER", "default": 0 },
            "is_active": { "type": "BOOLEAN", "default": true }
          }
        },
        "table": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "floor_id": { "type": "UUID", "fk": "floor.id", "required": true },
            "table_number": { "type": "VARCHAR(20)", "required": true },
            "section": { 
              "type": "ENUM", 
              "values": ["INDOOR", "OUTDOOR", "VIP", "PRIVATE"],
              "default": "INDOOR"
            },
            "capacity": { "type": "INTEGER", "default": 4 },
            "status": { 
              "type": "ENUM", 
              "values": ["AVAILABLE", "OCCUPIED", "RESERVED", "CLEANING"],
              "default": "AVAILABLE"
            },
            "current_order_id": { "type": "UUID", "nullable": true, "fk": "sales_order.id" },
            "position_x": { "type": "INTEGER", "nullable": true, "note": "For visual floor plan" },
            "position_y": { "type": "INTEGER", "nullable": true },
            "shape": { "type": "VARCHAR(20)", "default": "SQUARE" },
            "is_active": { "type": "BOOLEAN", "default": true }
          },
          "unique_constraint": ["floor_id", "table_number"],
          "indexes": ["floor_id", "status"]
        }
      },
      "features": {
        "save_check": "Save order without payment, stock RESERVED",
        "print_check": "Print bill for customer review, still not PAID",
        "split_bill_by_item": "Each diner pays for their items",
        "split_bill_by_amount": "Equal split among diners",
        "table_transfer": "Move order to different table",
        "table_merge": "Combine orders from multiple tables"
      }
    },

    "07_kitchen": {
      "priority": "HIGH",
      "status": "REQUIRED_FOR_RESTAURANTS",
      "entities": {
        "kitchen_station": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "code": { "type": "VARCHAR(20)", "unique": true },
            "name_ar": { "type": "VARCHAR(100)", "required": true },
            "name_en": { "type": "VARCHAR(100)", "required": true },
            "printer_ip": { "type": "VARCHAR(50)", "nullable": true },
            "display_screen_id": { "type": "VARCHAR(50)", "nullable": true },
            "sort_order": { "type": "INTEGER", "default": 0 },
            "is_active": { "type": "BOOLEAN", "default": true }
          }
        },
        "kitchen_ticket": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "ticket_number": { "type": "VARCHAR(30)", "unique": true },
            "order_id": { "type": "UUID", "fk": "sales_order.id", "required": true },
            "station_id": { "type": "UUID", "fk": "kitchen_station.id", "required": true },
            "status": { 
              "type": "ENUM", 
              "values": ["NEW", "FIRED", "IN_PROGRESS", "READY", "RECALLED"],
              "default": "NEW"
            },
            "priority": { "type": "INTEGER", "default": 0, "note": "Higher = more urgent" },
            "sent_at": { "type": "TIMESTAMP", "default": "NOW()" },
            "started_at": { "type": "TIMESTAMP", "nullable": true },
            "completed_at": { "type": "TIMESTAMP", "nullable": true },
            "recalled_at": { "type": "TIMESTAMP", "nullable": true }
          },
          "indexes": ["order_id", "station_id", "status"]
        },
        "kitchen_ticket_item": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "ticket_id": { "type": "UUID", "fk": "kitchen_ticket.id", "required": true },
            "order_item_id": { "type": "UUID", "fk": "order_item.id", "required": true },
            "product_name": { "type": "VARCHAR(255)", "required": true },
            "quantity": { "type": "DECIMAL(12,3)", "required": true },
            "modifiers_text": { "type": "TEXT", "nullable": true },
            "notes": { "type": "TEXT", "nullable": true },
            "status": { 
              "type": "ENUM", 
              "values": ["NEW", "IN_PROGRESS", "READY"],
              "default": "NEW"
            }
          },
          "indexes": ["ticket_id"]
        }
      },
      "business_rules": {
        "void_protection": {
          "can_void": ["NEW", "FIRED"],
          "cannot_void": ["PREPARING", "IN_PROGRESS", "READY", "SERVED"],
          "reason": "Food already prepared - prevents waste and fraud",
          "if_must_remove": "Log as waste, no refund on inventory"
        },
        "modifier_separation": {
          "description": "Items with different modifiers print on separate lines",
          "example": "2× Coffee with different sizes → 2 separate lines on ticket"
        }
      }
    },

    "08_customers": {
      "priority": "MEDIUM",
      "status": "PHASE_2",
      "entities": {
        "customer": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "name": { "type": "VARCHAR(255)", "required": true },
            "phone": { "type": "VARCHAR(20)", "unique": true, "required": true },
            "email": { "type": "VARCHAR(255)", "nullable": true },
            "address": { "type": "TEXT", "nullable": true },
            "tax_number": { "type": "VARCHAR(50)", "nullable": true, "note": "For B2B invoicing" },
            "tier": { 
              "type": "ENUM", 
              "values": ["STANDARD", "SILVER", "GOLD", "VIP", "STAFF"],
              "default": "STANDARD"
            },
            "tier_discount_percentage": { "type": "DECIMAL(5,2)", "default": 0 },
            "loyalty_points": { "type": "INTEGER", "default": 0 },
            "credit_balance": { "type": "DECIMAL(12,3)", "default": 0, "note": "Customer owes us (positive) or we owe customer (negative)" },
            "total_spent": { "type": "DECIMAL(12,3)", "default": 0 },
            "total_orders": { "type": "INTEGER", "default": 0 },
            "first_visit": { "type": "TIMESTAMP", "nullable": true },
            "last_visit": { "type": "TIMESTAMP", "nullable": true },
            "birth_date": { "type": "DATE", "nullable": true },
            "notes": { "type": "TEXT", "nullable": true },
            "custom_fields": { "type": "JSONB", "nullable": true },
            "is_active": { "type": "BOOLEAN", "default": true },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" },
            "updated_at": { "type": "TIMESTAMP" }
          },
          "indexes": ["phone", "tier", "is_active"]
        },
        "customer_address": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "customer_id": { "type": "UUID", "fk": "customer.id", "required": true },
            "label": { "type": "VARCHAR(50)", "note": "Home, Work, etc." },
            "address_line_1": { "type": "VARCHAR(255)", "required": true },
            "address_line_2": { "type": "VARCHAR(255)", "nullable": true },
            "city": { "type": "VARCHAR(100)", "nullable": true },
            "area": { "type": "VARCHAR(100)", "nullable": true },
            "delivery_zone_id": { "type": "UUID", "nullable": true, "fk": "delivery_zone.id" },
            "latitude": { "type": "DECIMAL(10,8)", "nullable": true },
            "longitude": { "type": "DECIMAL(11,8)", "nullable": true },
            "is_default": { "type": "BOOLEAN", "default": false }
          },
          "indexes": ["customer_id"]
        }
      }
    },

    "09_delivery": {
      "priority": "MEDIUM",
      "status": "PHASE_2",
      "entities": {
        "delivery_zone": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "code": { "type": "VARCHAR(10)", "unique": true },
            "name_ar": { "type": "VARCHAR(100)", "required": true },
            "name_en": { "type": "VARCHAR(100)", "required": true },
            "delivery_charge": { "type": "DECIMAL(12,3)", "required": true },
            "minimum_order": { "type": "DECIMAL(12,3)", "default": 0 },
            "estimated_minutes": { "type": "INTEGER", "nullable": true },
            "is_active": { "type": "BOOLEAN", "default": true }
          }
        },
        "driver": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "name": { "type": "VARCHAR(255)", "required": true },
            "phone": { "type": "VARCHAR(20)", "required": true },
            "vehicle_type": { "type": "VARCHAR(50)", "nullable": true },
            "vehicle_number": { "type": "VARCHAR(20)", "nullable": true },
            "is_active": { "type": "BOOLEAN", "default": true }
          }
        },
        "delivery_order": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "order_id": { "type": "UUID", "fk": "sales_order.id", "required": true, "unique": true },
            "zone_id": { "type": "UUID", "nullable": true, "fk": "delivery_zone.id" },
            "driver_id": { "type": "UUID", "nullable": true, "fk": "driver.id" },
            "customer_address_id": { "type": "UUID", "nullable": true, "fk": "customer_address.id" },
            "delivery_address": { "type": "TEXT", "required": true },
            "delivery_phone": { "type": "VARCHAR(20)", "required": true },
            "delivery_charge": { "type": "DECIMAL(12,3)", "required": true },
            "status": { 
              "type": "ENUM", 
              "values": ["PENDING", "ASSIGNED", "PICKED_UP", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED", "RETURNED"],
              "default": "PENDING"
            },
            "assigned_at": { "type": "TIMESTAMP", "nullable": true },
            "picked_up_at": { "type": "TIMESTAMP", "nullable": true },
            "delivered_at": { "type": "TIMESTAMP", "nullable": true },
            "notes": { "type": "TEXT", "nullable": true }
          },
          "indexes": ["order_id", "driver_id", "status"]
        }
      }
    },

    "10_discounts": {
      "priority": "MEDIUM",
      "status": "PHASE_2",
      "entities": {
        "discount": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "code": { "type": "VARCHAR(50)", "unique": true, "nullable": true },
            "name_ar": { "type": "VARCHAR(255)", "required": true },
            "name_en": { "type": "VARCHAR(255)", "required": true },
            "type": { 
              "type": "ENUM", 
              "values": ["PERCENTAGE", "FIXED_AMOUNT"],
              "required": true 
            },
            "value": { "type": "DECIMAL(12,3)", "required": true },
            "max_discount_amount": { "type": "DECIMAL(12,3)", "nullable": true, "note": "Cap for percentage discounts" },
            "min_order_amount": { "type": "DECIMAL(12,3)", "default": 0 },
            "company_name": { "type": "VARCHAR(255)", "nullable": true, "note": "For corporate discounts" },
            "requires_manager_approval": { "type": "BOOLEAN", "default": false },
            "applicable_order_types": { "type": "VARCHAR[]", "nullable": true },
            "applicable_categories": { "type": "UUID[]", "nullable": true },
            "start_date": { "type": "TIMESTAMP", "nullable": true },
            "end_date": { "type": "TIMESTAMP", "nullable": true },
            "start_time": { "type": "TIME", "nullable": true, "note": "For Happy Hour" },
            "end_time": { "type": "TIME", "nullable": true },
            "days_of_week": { "type": "INTEGER[]", "nullable": true, "note": "0=Sunday, 6=Saturday" },
            "usage_limit": { "type": "INTEGER", "nullable": true },
            "used_count": { "type": "INTEGER", "default": 0 },
            "is_active": { "type": "BOOLEAN", "default": true }
          },
          "indexes": ["code", "is_active", "start_date", "end_date"]
        }
      },
      "business_rules": {
        "application_order": "Discount applied AFTER tax calculation",
        "manager_threshold": {
          "without_manager": "15% maximum",
          "with_manager": "30% maximum (configurable)"
        }
      }
    },

    "11_users_roles": {
      "priority": "CRITICAL",
      "status": "REQUIRED_FOR_MVP",
      "entities": {
        "user": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "username": { "type": "VARCHAR(50)", "unique": true, "required": true },
            "name_ar": { "type": "VARCHAR(255)", "required": true },
            "name_en": { "type": "VARCHAR(255)", "nullable": true },
            "email": { "type": "VARCHAR(255)", "nullable": true },
            "phone": { "type": "VARCHAR(20)", "nullable": true },
            "pin": { "type": "VARCHAR(255)", "required": true, "note": "4-6 digit PIN, hashed" },
            "rfid_card": { "type": "VARCHAR(50)", "nullable": true },
            "role_id": { "type": "UUID", "fk": "role.id", "required": true },
            "is_active": { "type": "BOOLEAN", "default": true },
            "failed_login_attempts": { "type": "INTEGER", "default": 0 },
            "locked_until": { "type": "TIMESTAMP", "nullable": true },
            "last_login": { "type": "TIMESTAMP", "nullable": true },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" },
            "updated_at": { "type": "TIMESTAMP" }
          },
          "indexes": ["username", "role_id", "is_active"],
          "security": {
            "max_failed_attempts": 5,
            "lockout_minutes": 15
          }
        },
        "role": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "code": { "type": "VARCHAR(30)", "unique": true },
            "name_ar": { "type": "VARCHAR(100)", "required": true },
            "name_en": { "type": "VARCHAR(100)", "required": true },
            "permissions": { "type": "JSONB", "required": true },
            "is_system": { "type": "BOOLEAN", "default": false, "note": "Cannot be deleted" },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" }
          }
        },
        "manager_authorization": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "requesting_user_id": { "type": "UUID", "fk": "user.id", "required": true },
            "authorizing_user_id": { "type": "UUID", "fk": "user.id", "required": true },
            "action": { 
              "type": "ENUM", 
              "values": ["VOID_ITEM", "VOID_ORDER", "DISCOUNT_ABOVE_LIMIT", "REFUND", "PRICE_OVERRIDE", "SESSION_DISCREPANCY", "OPEN_DRAWER"],
              "required": true 
            },
            "reference_type": { "type": "VARCHAR(50)", "nullable": true },
            "reference_id": { "type": "UUID", "nullable": true },
            "reason": { "type": "TEXT", "nullable": true },
            "result": { 
              "type": "ENUM", 
              "values": ["APPROVED", "DENIED"],
              "required": true 
            },
            "authorized_at": { "type": "TIMESTAMP", "default": "NOW()" }
          },
          "indexes": ["requesting_user_id", "authorizing_user_id", "action", "authorized_at"]
        }
      },
      "default_roles": [
        { "code": "ADMIN", "permissions": "*" },
        { "code": "MANAGER", "permissions": ["authorize_void", "authorize_discount", "view_reports", "manage_users", "close_eod"] },
        { "code": "CASHIER", "permissions": ["pos_sales", "apply_discount_15", "park_order"] },
        { "code": "WAITER", "permissions": ["take_orders", "save_check", "print_check", "manage_tables"] },
        { "code": "CHEF", "permissions": ["view_kds", "update_item_status"] }
      ]
    },

    "12_settings": {
      "priority": "CRITICAL",
      "status": "REQUIRED_FOR_MVP",
      "entities": {
        "store_settings": {
          "columns": {
            "id": { "type": "UUID", "primary": true, "note": "Single row table" },
            "store_name_ar": { "type": "VARCHAR(255)", "required": true },
            "store_name_en": { "type": "VARCHAR(255)", "required": true },
            "legal_name": { "type": "VARCHAR(255)", "nullable": true },
            "tax_registration_number": { "type": "VARCHAR(50)", "required": true },
            "commercial_registration": { "type": "VARCHAR(50)", "nullable": true },
            "address_ar": { "type": "TEXT", "nullable": true },
            "address_en": { "type": "TEXT", "nullable": true },
            "phone": { "type": "VARCHAR(20)", "nullable": true },
            "email": { "type": "VARCHAR(255)", "nullable": true },
            "website": { "type": "VARCHAR(255)", "nullable": true },
            "logo_url": { "type": "VARCHAR(500)", "nullable": true },
            "currency_code": { "type": "VARCHAR(3)", "default": "SAR" },
            "currency_symbol": { "type": "VARCHAR(5)", "default": "ر.س" },
            "currency_decimal_places": { "type": "INTEGER", "default": 2 },
            "default_language": { "type": "VARCHAR(5)", "default": "ar" },
            "timezone": { "type": "VARCHAR(50)", "default": "Asia/Riyadh" },
            "fiscal_year_start_month": { "type": "INTEGER", "default": 1 },
            "receipt_footer_ar": { "type": "TEXT", "nullable": true },
            "receipt_footer_en": { "type": "TEXT", "nullable": true },
            "update_channel": { "type": "ENUM", "values": ["STABLE", "BETA"], "default": "STABLE", "note": "For auto-update mechanism" },
            "auto_update_enabled": { "type": "BOOLEAN", "default": false },
            "current_version": { "type": "VARCHAR(20)", "nullable": true },
            "last_update_check": { "type": "TIMESTAMP", "nullable": true },
            "multi_currency_enabled": { "type": "BOOLEAN", "default": false, "note": "FUTURE: Enable foreign currency payments" }
          }
        },
        "tax_settings": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "tax_code": { "type": "VARCHAR(20)", "unique": true },
            "name_ar": { "type": "VARCHAR(100)", "required": true },
            "name_en": { "type": "VARCHAR(100)", "required": true },
            "rate": { "type": "DECIMAL(5,4)", "required": true, "note": "0.15 for 15%" },
            "is_inclusive": { "type": "BOOLEAN", "default": true },
            "is_default": { "type": "BOOLEAN", "default": false },
            "is_active": { "type": "BOOLEAN", "default": true },
            "tax_account_id": { "type": "UUID", "nullable": true, "fk": "chart_of_accounts.id", "note": "Tax Payable account for accounting bridge" }
          }
        },
        "pos_settings": {
          "description": "Single row configuration for POS behavior",
          "structure": {
            "service_charge_rate": { "type": "DECIMAL(5,4)", "default": 0.12 },
            "service_charge_order_types": { "type": "VARCHAR[]", "default": ["DINE_IN"] },
            "max_discount_without_manager": { "type": "DECIMAL(5,2)", "default": 15 },
            "max_discount_with_manager": { "type": "DECIMAL(5,2)", "default": 30 },
            "allow_price_override": { "type": "BOOLEAN", "default": false },
            "require_customer_for_delivery": { "type": "BOOLEAN", "default": true },
            "auto_print_receipt": { "type": "BOOLEAN", "default": true },
            "auto_print_kitchen_ticket": { "type": "BOOLEAN", "default": true },
            "quick_cash_amounts": { "type": "DECIMAL[]", "default": [0, 50, 100, 200, 500] }
          }
        }
      }
    },

    "13_compliance": {
      "priority": "CRITICAL",
      "status": "REQUIRED_FOR_MVP",
      "zatca": {
        "description": "Saudi Arabia ZATCA Phase 2 E-Invoicing",
        "implementation": {
          "hash_chain": {
            "algorithm": "SHA-256",
            "first_invoice": "previous_hash = NULL",
            "subsequent": "previous_hash = last_invoice.zatca_hash",
            "chain_break_error": "ZATCA_001 - CRITICAL - HALT ALL INVOICING"
          },
          "qr_code": {
            "format": "TLV Base64",
            "fields": ["Seller Name", "VAT Number", "Timestamp", "Total with VAT", "VAT Amount", "Invoice Hash"]
          },
          "xml_generation": {
            "standard": "UBL 2.1",
            "digital_signature": "Required"
          }
        },
        "entity": {
          "zatca_invoice": {
            "columns": {
              "id": { "type": "UUID", "primary": true },
              "order_id": { "type": "UUID", "fk": "sales_order.id", "unique": true },
              "invoice_uuid": { "type": "VARCHAR(50)", "unique": true },
              "invoice_hash": { "type": "VARCHAR(100)", "required": true },
              "previous_hash": { "type": "VARCHAR(100)", "nullable": true },
              "xml_content": { "type": "TEXT", "required": true },
              "qr_code": { "type": "TEXT", "required": true },
              "submission_status": { 
                "type": "ENUM", 
                "values": ["PENDING", "SUBMITTED", "ACCEPTED", "REJECTED", "ERROR"],
                "default": "PENDING"
              },
              "submission_response": { "type": "JSONB", "nullable": true },
              "submitted_at": { "type": "TIMESTAMP", "nullable": true },
              "created_at": { "type": "TIMESTAMP", "default": "NOW()" }
            }
          },
          "zatca_device_config": {
            "description": "CRITICAL: Stores ZATCA CSID certificates per device - MUST BE ENCRYPTED",
            "columns": {
              "id": { "type": "UUID", "primary": true },
              "terminal_id": { "type": "UUID", "fk": "terminal.id", "unique": true },
              "device_serial_number": { "type": "VARCHAR(100)", "required": true },
              "csid": { "type": "TEXT", "required": true, "note": "ENCRYPTED - Compliance Solution Identifier" },
              "private_key_encrypted": { "type": "TEXT", "required": true, "note": "ENCRYPTED - Private key for signing" },
              "certificate": { "type": "TEXT", "required": true, "note": "Public certificate" },
              "csid_expiry": { "type": "TIMESTAMP", "required": true },
              "environment": { "type": "ENUM", "values": ["SANDBOX", "SIMULATION", "PRODUCTION"], "default": "SANDBOX" },
              "onboarding_status": { 
                "type": "ENUM", 
                "values": ["PENDING", "CSR_GENERATED", "CSID_ISSUED", "ACTIVE", "EXPIRED", "REVOKED"],
                "default": "PENDING"
              },
              "last_renewal_date": { "type": "TIMESTAMP", "nullable": true },
              "created_at": { "type": "TIMESTAMP", "default": "NOW()" },
              "updated_at": { "type": "TIMESTAMP" }
            },
            "indexes": ["terminal_id", "onboarding_status"],
            "security_note": "CSID and private_key MUST be encrypted using AES-256. Key stored in environment variable, NOT in database."
          }
        }
      },
      "eta": {
        "description": "Egypt Tax Authority E-Receipt System",
        "implementation": {
          "receipt_uuid": "Unique per transaction",
          "real_time_validation": true,
          "format": "JSON or XML per ETA specification"
        }
      }
    },

    "14_reports": {
      "priority": "HIGH",
      "status": "PHASE_2",
      "reports": [
        { "code": "SALES_SUMMARY", "name": "Sales Summary Report", "grouping": ["Day", "Week", "Month"] },
        { "code": "SALES_BY_PRODUCT", "name": "Sales by Product" },
        { "code": "SALES_BY_CATEGORY", "name": "Sales by Category" },
        { "code": "SALES_BY_CASHIER", "name": "Sales by Cashier" },
        { "code": "SALES_BY_ORDER_TYPE", "name": "Sales by Order Type" },
        { "code": "SALES_BY_PAYMENT_METHOD", "name": "Sales by Payment Method" },
        { "code": "X_REPORT", "name": "X-Report (Mid-Shift Snapshot)" },
        { "code": "Z_REPORT", "name": "Z-Report (End of Day)" },
        { "code": "VOID_REPORT", "name": "Void Report with Reasons" },
        { "code": "DISCOUNT_REPORT", "name": "Discount Report" },
        { "code": "INVENTORY_VALUATION", "name": "Inventory Valuation" },
        { "code": "INVENTORY_MOVEMENT", "name": "Inventory Movement Log" },
        { "code": "LOW_STOCK_ALERT", "name": "Low Stock Alert" },
        { "code": "WASTE_REPORT", "name": "Waste/Spoilage Report" },
        { "code": "CUSTOMER_ANALYSIS", "name": "Customer Analysis" },
        { "code": "TAX_REPORT", "name": "Tax Collected Report" }
      ]
    },

    "15_audit": {
      "priority": "HIGH",
      "status": "PHASE_2",
      "entities": {
        "audit_log": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "entity_type": { "type": "VARCHAR(50)", "required": true },
            "entity_id": { "type": "UUID", "required": true },
            "action": { 
              "type": "ENUM", 
              "values": ["CREATE", "UPDATE", "DELETE", "VOID", "STATUS_CHANGE"],
              "required": true 
            },
            "user_id": { "type": "UUID", "fk": "user.id", "required": true },
            "old_values": { "type": "JSONB", "nullable": true },
            "new_values": { "type": "JSONB", "nullable": true },
            "ip_address": { "type": "VARCHAR(50)", "nullable": true },
            "device_info": { "type": "JSONB", "nullable": true },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" }
          },
          "indexes": ["entity_type", "entity_id", "user_id", "action", "created_at"],
          "partitioning": {
            "strategy": "RANGE",
            "column": "created_at",
            "interval": "MONTHLY",
            "retention_months": 24
          }
        }
      }
    },

    "16_accounting_placeholder": {
      "priority": "LOW",
      "status": "PHASE_4_FUTURE",
      "description": "Accounting Bridge - Tables created now but empty, to be implemented in Phase 4",
      "note": "Foreign keys from product, tax_settings, payment_method point here. Tables exist but logic is future.",
      "entities": {
        "chart_of_accounts": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "account_code": { "type": "VARCHAR(20)", "unique": true, "required": true },
            "name_ar": { "type": "VARCHAR(255)", "required": true },
            "name_en": { "type": "VARCHAR(255)", "required": true },
            "account_type": { 
              "type": "ENUM", 
              "values": ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"],
              "required": true 
            },
            "parent_id": { "type": "UUID", "nullable": true, "fk": "chart_of_accounts.id" },
            "is_active": { "type": "BOOLEAN", "default": true },
            "is_system": { "type": "BOOLEAN", "default": false, "note": "Cannot be deleted if true" }
          },
          "indexes": ["account_code", "account_type", "parent_id"]
        },
        "journal_entry": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "entry_number": { "type": "VARCHAR(30)", "unique": true },
            "entry_date": { "type": "DATE", "required": true },
            "reference_type": { "type": "VARCHAR(50)", "nullable": true, "note": "register_session, purchase_invoice, etc." },
            "reference_id": { "type": "UUID", "nullable": true },
            "description": { "type": "TEXT", "nullable": true },
            "status": { 
              "type": "ENUM", 
              "values": ["DRAFT", "POSTED", "REVERSED"],
              "default": "DRAFT",
              "note": "POS creates DRAFT, accountant reviews and POSTs"
            },
            "total_debit": { "type": "DECIMAL(12,3)", "required": true },
            "total_credit": { "type": "DECIMAL(12,3)", "required": true },
            "posted_by": { "type": "UUID", "nullable": true, "fk": "user.id" },
            "posted_at": { "type": "TIMESTAMP", "nullable": true },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" }
          },
          "indexes": ["entry_date", "reference_type", "reference_id", "status"],
          "validation": "total_debit MUST equal total_credit"
        },
        "journal_entry_line": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "entry_id": { "type": "UUID", "fk": "journal_entry.id", "required": true },
            "account_id": { "type": "UUID", "fk": "chart_of_accounts.id", "required": true },
            "debit": { "type": "DECIMAL(12,3)", "default": 0 },
            "credit": { "type": "DECIMAL(12,3)", "default": 0 },
            "description": { "type": "TEXT", "nullable": true }
          },
          "indexes": ["entry_id", "account_id"],
          "validation": "Either debit OR credit must be > 0, not both"
        }
      },
      "future_implementation": {
        "session_aggregation": "One journal entry per closed session (not per transaction)",
        "auto_posting": "Optional - can be manual review or auto-post",
        "separate_module": "Can be sold separately as add-on"
      }
    },

    "17_multi_currency_extension": {
      "priority": "LOW",
      "status": "FUTURE_ENTERPRISE",
      "description": "Multi-Currency support for tourist areas and international payments",
      "note": "NOT needed for MVP - 99% of transactions are local currency. Add when targeting bazaars, hotels, tourist shops.",
      "current_design": {
        "base_currency": "Single currency per installation (SAR or EGP)",
        "configured_in": "store_settings.currency_code",
        "all_amounts_stored_in": "Base currency"
      },
      "future_entities": {
        "currency": {
          "description": "Supported foreign currencies",
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "code": { "type": "VARCHAR(3)", "unique": true, "required": true, "note": "ISO 4217: USD, EUR, GBP" },
            "name_ar": { "type": "VARCHAR(100)", "required": true },
            "name_en": { "type": "VARCHAR(100)", "required": true },
            "symbol": { "type": "VARCHAR(5)", "required": true },
            "decimal_places": { "type": "INTEGER", "default": 2 },
            "is_active": { "type": "BOOLEAN", "default": true }
          }
        },
        "currency_exchange_rate": {
          "description": "Historical exchange rates - new record for each rate change",
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "currency_code": { "type": "VARCHAR(3)", "fk": "currency.code", "required": true },
            "rate_to_base": { "type": "DECIMAL(12,6)", "required": true, "note": "1 USD = 3.75 SAR means rate_to_base = 3.75" },
            "rate_from_base": { "type": "DECIMAL(12,6)", "required": true, "note": "1 SAR = 0.2667 USD (inverse)" },
            "effective_from": { "type": "TIMESTAMP", "default": "NOW()" },
            "effective_to": { "type": "TIMESTAMP", "nullable": true, "note": "NULL = current rate" },
            "source": { "type": "ENUM", "values": ["MANUAL", "API_FEED", "BANK"], "default": "MANUAL" },
            "created_by": { "type": "UUID", "fk": "user.id" }
          },
          "indexes": ["currency_code", "effective_from"],
          "note": "To get current rate: WHERE effective_to IS NULL"
        }
      },
      "payment_fields_added": {
        "note": "These fields already added to payment entity as nullable for future use",
        "fields": [
          "foreign_currency_code VARCHAR(3) - The currency customer paid in (USD)",
          "foreign_amount DECIMAL(12,3) - Amount in foreign currency (100 USD)",
          "exchange_rate DECIMAL(12,6) - Rate at payment time (3.75)",
          "amount DECIMAL(12,3) - ALWAYS in base currency (375 SAR)"
        ],
        "calculation": "amount = foreign_amount × exchange_rate"
      },
      "implementation_notes": {
        "reporting": "All reports in base currency - foreign payments converted at historical rate",
        "cash_drawer": "May need separate physical drawer or cash count per currency",
        "accounting": "Foreign currency gain/loss account needed in chart_of_accounts",
        "ui_change": "Payment screen shows currency selector only if multi-currency enabled"
      },
      "activation": {
        "setting": "store_settings.multi_currency_enabled BOOLEAN default false",
        "when_false": "Foreign currency fields hidden in UI, validation skipped",
        "when_true": "Currency selector appears, exchange rate lookup required"
      }
    },

    "18_purchasing": {
      "priority": "MEDIUM",
      "status": "PHASE_3",
      "description": "Purchase Orders and Supplier Management for inventory replenishment",
      "entities": {
        "supplier": {
          "description": "Vendors/Suppliers for purchasing",
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "code": { "type": "VARCHAR(20)", "unique": true },
            "name_ar": { "type": "VARCHAR(255)", "required": true },
            "name_en": { "type": "VARCHAR(255)", "required": true },
            "tax_number": { "type": "VARCHAR(50)", "nullable": true },
            "contact_person": { "type": "VARCHAR(255)", "nullable": true },
            "phone": { "type": "VARCHAR(20)", "nullable": true },
            "email": { "type": "VARCHAR(255)", "nullable": true },
            "address": { "type": "TEXT", "nullable": true },
            "payment_terms_days": { "type": "INTEGER", "default": 30 },
            "credit_limit": { "type": "DECIMAL(12,3)", "default": 0 },
            "current_balance": { "type": "DECIMAL(12,3)", "default": 0, "note": "What we owe them" },
            "is_active": { "type": "BOOLEAN", "default": true },
            "payable_account_id": { "type": "UUID", "nullable": true, "fk": "chart_of_accounts.id" },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" }
          },
          "indexes": ["code", "is_active"]
        },
        "purchase_order": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "po_number": { "type": "VARCHAR(30)", "unique": true },
            "supplier_id": { "type": "UUID", "fk": "supplier.id", "required": true },
            "warehouse_id": { "type": "UUID", "fk": "warehouse.id", "required": true },
            "order_date": { "type": "DATE", "required": true },
            "expected_date": { "type": "DATE", "nullable": true },
            "status": { 
              "type": "ENUM", 
              "values": ["DRAFT", "SENT", "PARTIAL_RECEIVED", "RECEIVED", "CANCELLED"],
              "default": "DRAFT"
            },
            "subtotal": { "type": "DECIMAL(12,3)", "default": 0 },
            "tax_amount": { "type": "DECIMAL(12,3)", "default": 0 },
            "total": { "type": "DECIMAL(12,3)", "default": 0 },
            "notes": { "type": "TEXT", "nullable": true },
            "created_by": { "type": "UUID", "fk": "user.id", "required": true },
            "approved_by": { "type": "UUID", "nullable": true, "fk": "user.id" },
            "created_at": { "type": "TIMESTAMP", "default": "NOW()" }
          },
          "indexes": ["po_number", "supplier_id", "status", "order_date"]
        },
        "purchase_order_item": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "purchase_order_id": { "type": "UUID", "fk": "purchase_order.id", "required": true },
            "product_id": { "type": "UUID", "fk": "product.id", "required": true },
            "quantity_ordered": { "type": "DECIMAL(12,3)", "required": true },
            "quantity_received": { "type": "DECIMAL(12,3)", "default": 0 },
            "unit_cost": { "type": "DECIMAL(12,3)", "required": true },
            "tax_rate": { "type": "DECIMAL(5,4)", "default": 0 },
            "line_total": { "type": "DECIMAL(12,3)", "required": true }
          },
          "indexes": ["purchase_order_id", "product_id"]
        },
        "goods_receipt": {
          "description": "Receiving inventory from purchase orders",
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "grn_number": { "type": "VARCHAR(30)", "unique": true, "note": "Goods Receipt Note" },
            "purchase_order_id": { "type": "UUID", "fk": "purchase_order.id", "required": true },
            "receipt_date": { "type": "TIMESTAMP", "default": "NOW()" },
            "supplier_invoice_number": { "type": "VARCHAR(50)", "nullable": true },
            "notes": { "type": "TEXT", "nullable": true },
            "received_by": { "type": "UUID", "fk": "user.id", "required": true }
          },
          "indexes": ["purchase_order_id", "receipt_date"]
        },
        "goods_receipt_item": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "goods_receipt_id": { "type": "UUID", "fk": "goods_receipt.id", "required": true },
            "po_item_id": { "type": "UUID", "fk": "purchase_order_item.id", "required": true },
            "product_id": { "type": "UUID", "fk": "product.id", "required": true },
            "quantity_received": { "type": "DECIMAL(12,3)", "required": true },
            "batch_number": { "type": "VARCHAR(50)", "nullable": true },
            "expiry_date": { "type": "DATE", "nullable": true },
            "unit_cost": { "type": "DECIMAL(12,3)", "required": true, "note": "Actual cost, may differ from PO" }
          },
          "indexes": ["goods_receipt_id", "product_id"]
        }
      },
      "workflows": {
        "purchase_flow": [
          "1. Create PO (DRAFT)",
          "2. Approve and send to supplier (SENT)",
          "3. Receive goods (creates goods_receipt)",
          "4. Each receipt updates PO status and creates inventory_batch + stock_movement",
          "5. If partial: PARTIAL_RECEIVED, if complete: RECEIVED"
        ],
        "auto_reorder": {
          "description": "Future: Auto-generate PO when stock falls below reorder_point",
          "requires": "product.reorder_point and product.preferred_supplier_id fields"
        }
      }
    },

    "19_production": {
      "priority": "LOW",
      "status": "PHASE_4_FUTURE",
      "description": "Production Orders for MAKE_TO_STOCK items (e.g., prepare dough in batch)",
      "note": "Required when using replenishment_method = MAKE_TO_STOCK",
      "entities": {
        "production_order": {
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "production_number": { "type": "VARCHAR(30)", "unique": true },
            "product_id": { "type": "UUID", "fk": "product.id", "required": true, "note": "The finished product to make" },
            "quantity_to_produce": { "type": "DECIMAL(12,3)", "required": true },
            "quantity_produced": { "type": "DECIMAL(12,3)", "default": 0 },
            "warehouse_id": { "type": "UUID", "fk": "warehouse.id", "required": true },
            "status": { 
              "type": "ENUM", 
              "values": ["DRAFT", "PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
              "default": "DRAFT"
            },
            "planned_date": { "type": "DATE", "required": true },
            "started_at": { "type": "TIMESTAMP", "nullable": true },
            "completed_at": { "type": "TIMESTAMP", "nullable": true },
            "notes": { "type": "TEXT", "nullable": true },
            "created_by": { "type": "UUID", "fk": "user.id", "required": true }
          },
          "indexes": ["product_id", "status", "planned_date"]
        },
        "production_order_input": {
          "description": "Raw materials consumed (auto-calculated from recipe × quantity)",
          "columns": {
            "id": { "type": "UUID", "primary": true },
            "production_order_id": { "type": "UUID", "fk": "production_order.id", "required": true },
            "product_id": { "type": "UUID", "fk": "product.id", "required": true },
            "quantity_required": { "type": "DECIMAL(12,3)", "required": true },
            "quantity_consumed": { "type": "DECIMAL(12,3)", "default": 0 }
          }
        }
      },
      "workflow": [
        "1. Create production order for MAKE_TO_STOCK product",
        "2. System explodes BOM to calculate required raw materials",
        "3. Start production → reserve/deduct raw materials",
        "4. Complete production → add finished product to inventory",
        "5. COGS calculated from consumed materials"
      ]
    }
  },

  "calculations": {
    "grand_total_pipeline": {
      "description": "7-Step Calculation Pipeline",
      "steps": [
        {
          "step": 1,
          "name": "item_subtotal",
          "formula": "SUM(order_item.quantity × (order_item.unit_price + order_item.modifiers_amount))"
        },
        {
          "step": 2,
          "name": "service_charge",
          "formula": "IF order_type IN service_charge_order_types THEN item_subtotal × service_charge_rate ELSE 0"
        },
        {
          "step": 3,
          "name": "delivery_charge",
          "formula": "Based on zone or fixed for aggregator"
        },
        {
          "step": 4,
          "name": "subtotal_before_tax",
          "formula": "item_subtotal + service_charge + delivery_charge"
        },
        {
          "step": 5,
          "name": "tax_amount",
          "formula_inclusive": "(subtotal_before_tax × tax_rate) / (1 + tax_rate)",
          "formula_exclusive": "subtotal_before_tax × tax_rate"
        },
        {
          "step": 6,
          "name": "discount_amount",
          "formula": "Applied AFTER tax on (subtotal_before_tax)",
          "note": "Percentage or fixed amount"
        },
        {
          "step": 7,
          "name": "grand_total",
          "formula": "subtotal_before_tax - discount_amount",
          "note": "For inclusive tax, tax is already embedded"
        }
      ]
    },
    "delivery_zones": {
      "formula": "50 + (20 × (zone_index - 1))",
      "zones": {
        "A": 50,
        "B": 70,
        "C": 90,
        "D": 110
      },
      "aggregator_fixed": 50
    }
  },

  "offline_sync": {
    "strategy_per_entity": {
      "sales_order": {
        "strategy": "APPEND_ONLY",
        "description": "Orders never modified, only new state transitions appended"
      },
      "inventory": {
        "strategy": "DELTA_INCREMENT",
        "description": "Only store qty += X operations, never qty = X"
      },
      "customer": {
        "strategy": "SERVER_AUTHORITY",
        "description": "Server version always wins, queue local edits for review"
      },
      "payment": {
        "strategy": "IMMUTABLE_APPEND",
        "description": "Once created, never modified. Immediate sync on reconnect."
      },
      "product": {
        "strategy": "SERVER_AUTHORITY",
        "description": "Product master comes from server"
      }
    },
    "queue_priority": {
      "CRITICAL": ["payment", "refund"],
      "HIGH": ["sales_order", "inventory_movement"],
      "NORMAL": ["customer_update", "audit_log"]
    }
  },

  "hardware": {
    "receipt_printer": {
      "protocol": "ESC/POS",
      "connection": ["USB", "Ethernet", "Bluetooth"],
      "paper_width": ["58mm", "80mm"],
      "drawer_kick": "ESC p 0 50 250"
    },
    "cash_drawer": {
      "connection": "RJ11 through receipt printer",
      "kick_command": "Via printer"
    },
    "barcode_scanner": {
      "type": ["USB_HID", "Bluetooth"],
      "formats": ["EAN-13", "Code-128", "QR"]
    },
    "payment_terminal": {
      "integration": "WebSocket API",
      "protocol": "ISO 8583",
      "supported": ["Geidea", "NearPay", "Mada terminals"]
    },
    "kitchen_display": {
      "type": ["Tablet", "Dedicated screen"],
      "connection": "WebSocket",
      "real_time": true
    }
  },

  "error_codes": {
    "SALES": {
      "SALES_001": "Order not found",
      "SALES_002": "Invalid order status transition",
      "SALES_003": "Order already paid",
      "SALES_004": "Cannot modify fired order"
    },
    "INVENTORY": {
      "INV_001": "Product not found",
      "INV_002": "Insufficient stock",
      "INV_003": "Batch not found",
      "INV_004": "Cannot void - item already preparing"
    },
    "PAYMENT": {
      "PAY_001": "Session not open",
      "PAY_002": "Payment declined",
      "PAY_003": "Split payment total mismatch"
    },
    "SESSION": {
      "SESS_001": "Session not found",
      "SESS_002": "Session already closed",
      "SESS_003": "Discrepancy exceeds threshold"
    },
    "COMPLIANCE": {
      "ZATCA_001": "Hash chain broken - CRITICAL",
      "ZATCA_002": "Invalid VAT number",
      "ETA_001": "ETA submission failed"
    },
    "AUTH": {
      "AUTH_001": "Invalid credentials",
      "AUTH_002": "Account locked",
      "AUTH_003": "Insufficient permissions",
      "AUTH_004": "Manager authorization required"
    }
  },

  "implementation_roadmap": {
    "phase_1_mvp": {
      "duration": "6-8 weeks",
      "modules": [
        "Products & Categories",
        "Basic Inventory (FIFO, no BOM)",
        "POS Sales (TAKEAWAY, DINE_IN)",
        "Payments (CASH, CARD)",
        "Sessions (Open/Close with blind count)",
        "Users & Roles (basic)",
        "Settings (store, tax)",
        "Receipt Printing",
        "ZATCA Basic (Hash chain, QR)"
      ]
    },
    "phase_2_restaurant": {
      "duration": "4-6 weeks",
      "modules": [
        "Tables & Floors",
        "Kitchen Display System",
        "Recipe/BOM (multi-level)",
        "Modifiers (full implementation)",
        "Customers & Loyalty (basic)",
        "Delivery Zones",
        "Discounts & Promotions"
      ]
    },
    "phase_3_advanced": {
      "duration": "4-6 weeks",
      "modules": [
        "Full Reports Suite",
        "Audit Trail",
        "Offline Sync (full)",
        "Customer Credit/Debit",
        "Advanced Loyalty",
        "Multi-warehouse",
        "Purchase Orders (basic)"
      ]
    },
    "phase_4_enterprise": {
      "duration": "Ongoing",
      "modules": [
        "Accounting Bridge",
        "HR Integration",
        "Advanced Analytics",
        "Mobile App (Staff)",
        "Customer-facing Kiosk",
        "Multi-branch Management",
        "Production Orders",
        "Multi-Currency"
      ]
    }
  },

  "sequence_generation": {
    "description": "Number sequences for various documents",
    "entity": {
      "sequence_config": {
        "columns": {
          "id": { "type": "UUID", "primary": true },
          "sequence_type": { 
            "type": "ENUM", 
            "values": ["ORDER", "INVOICE", "REFUND", "SESSION", "PO", "GRN", "PRODUCTION"],
            "unique": true 
          },
          "prefix": { "type": "VARCHAR(10)", "default": "" },
          "include_date": { "type": "BOOLEAN", "default": true },
          "date_format": { "type": "VARCHAR(20)", "default": "YYYYMMDD" },
          "separator": { "type": "VARCHAR(5)", "default": "-" },
          "padding": { "type": "INTEGER", "default": 4 },
          "reset_daily": { "type": "BOOLEAN", "default": true },
          "last_number": { "type": "INTEGER", "default": 0 },
          "last_reset_date": { "type": "DATE", "nullable": true }
        }
      }
    },
    "examples": {
      "ORDER": { "prefix": "ORD", "format": "ORD-20260108-0001" },
      "INVOICE": { "prefix": "INV", "format": "INV-20260108-0001" },
      "REFUND": { "prefix": "REF", "format": "REF-20260108-0001" },
      "SESSION": { "prefix": "SES", "format": "SES-20260108-001" },
      "PO": { "prefix": "PO", "format": "PO-20260108-001", "reset_daily": false },
      "GRN": { "prefix": "GRN", "format": "GRN-20260108-001" }
    },
    "generation_algorithm": [
      "1. Get sequence_config for type",
      "2. If reset_daily AND last_reset_date != today: reset last_number to 0",
      "3. Increment last_number",
      "4. Build: prefix + separator + date + separator + padded_number",
      "5. Update sequence_config with new last_number and last_reset_date",
      "6. Use database transaction to prevent duplicates under concurrency"
    ]
  },

  "data_seeding": {
    "description": "Required seed data for new installation",
    "seeds": {
      "roles": [
        { "code": "ADMIN", "name_ar": "مدير النظام", "name_en": "Administrator" },
        { "code": "MANAGER", "name_ar": "مدير", "name_en": "Manager" },
        { "code": "CASHIER", "name_ar": "كاشير", "name_en": "Cashier" },
        { "code": "WAITER", "name_ar": "جرسون", "name_en": "Waiter" },
        { "code": "CHEF", "name_ar": "شيف", "name_en": "Chef" }
      ],
      "tax_settings": [
        { "tax_code": "VAT_15", "name_ar": "ضريبة القيمة المضافة 15%", "name_en": "VAT 15%", "rate": 0.15, "is_inclusive": true, "is_default": true },
        { "tax_code": "VAT_14", "name_ar": "ضريبة القيمة المضافة 14%", "name_en": "VAT 14%", "rate": 0.14, "is_inclusive": true, "note": "Egypt" },
        { "tax_code": "ZERO", "name_ar": "صفر", "name_en": "Zero Rated", "rate": 0, "is_default": false },
        { "tax_code": "EXEMPT", "name_ar": "معفى", "name_en": "Exempt", "rate": 0, "is_default": false }
      ],
      "payment_methods": [
        { "code": "CASH", "name_ar": "كاش", "name_en": "Cash", "type": "CASH" },
        { "code": "MADA", "name_ar": "مدى", "name_en": "Mada", "type": "CARD" },
        { "code": "VISA", "name_ar": "فيزا", "name_en": "Visa", "type": "CARD" },
        { "code": "MASTERCARD", "name_ar": "ماستركارد", "name_en": "Mastercard", "type": "CARD" },
        { "code": "CREDIT", "name_ar": "آجل", "name_en": "Customer Credit", "type": "CREDIT" }
      ],
      "units_of_measure": [
        { "code": "PIECE", "name_ar": "قطعة", "name_en": "Piece" },
        { "code": "KG", "name_ar": "كيلو", "name_en": "Kilogram" },
        { "code": "G", "name_ar": "جرام", "name_en": "Gram" },
        { "code": "L", "name_ar": "لتر", "name_en": "Liter" },
        { "code": "ML", "name_ar": "مل", "name_en": "Milliliter" },
        { "code": "BOX", "name_ar": "كرتونة", "name_en": "Box" },
        { "code": "PACK", "name_ar": "باكت", "name_en": "Pack" }
      ],
      "default_warehouse": {
        "code": "MAIN",
        "name_ar": "المخزن الرئيسي",
        "name_en": "Main Warehouse"
      },
      "default_admin_user": {
        "username": "admin",
        "name_ar": "مدير النظام",
        "name_en": "System Admin",
        "pin": "1234",
        "note": "MUST be changed on first login"
      },
      "sequence_configs": [
        { "sequence_type": "ORDER", "prefix": "ORD", "reset_daily": true },
        { "sequence_type": "INVOICE", "prefix": "INV", "reset_daily": true },
        { "sequence_type": "REFUND", "prefix": "REF", "reset_daily": true },
        { "sequence_type": "SESSION", "prefix": "SES", "reset_daily": true },
        { "sequence_type": "PO", "prefix": "PO", "reset_daily": false },
        { "sequence_type": "GRN", "prefix": "GRN", "reset_daily": true },
        { "sequence_type": "PRODUCTION", "prefix": "PRD", "reset_daily": false }
      ]
    }
  }
}