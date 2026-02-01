/**
 * NerdPOS Permission Constants
 *
 * Naming Convention: module.action
 * Examples: inventory.view, users.create, payments.approve-refund
 *
 * Permission Levels:
 * - CASHIER: Basic POS operations (view, create orders, process payments)
 * - MANAGER: Elevated operations (adjust stock, approve refunds, close sessions)
 * - ADMIN: System administration (user management, settings, role assignments)
 */

export const PERMISSIONS = {
  // ==================== INVENTORY ====================
  INVENTORY_VIEW: 'inventory.view', // All roles
  INVENTORY_RECEIVE: 'inventory.receive', // Cashier+
  INVENTORY_TRANSFER: 'inventory.transfer', // Cashier+
  INVENTORY_ADJUST: 'inventory.adjust', // 🔒 Manager+
  INVENTORY_DELETE: 'inventory.delete', // 🔒 Admin only
  INVENTORY_RECIPE_VIEW: 'inventory.recipe.view', // All roles
  INVENTORY_RECIPE_MANAGE: 'inventory.recipe.manage', // Manager+

  // ==================== PRODUCTS ====================
  PRODUCTS_VIEW: 'products.view', // All roles
  PRODUCTS_CREATE: 'products.create', // Manager+
  PRODUCTS_UPDATE: 'products.update', // Manager+
  PRODUCTS_DELETE: 'products.delete', // 🔒 Admin only

  // ==================== CATEGORIES ====================
  CATEGORIES_VIEW: 'categories.view', // All roles
  CATEGORIES_CREATE: 'categories.create', // Manager+
  CATEGORIES_UPDATE: 'categories.update', // Manager+
  CATEGORIES_DELETE: 'categories.delete', // 🔒 Admin only

  // ==================== MODIFIER GROUPS ====================
  MODIFIERS_VIEW: 'modifiers.view', // All roles
  MODIFIERS_CREATE: 'modifiers.create', // Manager+
  MODIFIERS_UPDATE: 'modifiers.update', // Manager+
  MODIFIERS_DELETE: 'modifiers.delete', // 🔒 Admin only

  // ==================== SALES ====================
  SALES_VIEW: 'sales.view', // Cashier+
  SALES_CREATE: 'sales.create', // Cashier+
  SALES_UPDATE: 'sales.update', // Cashier+
  SALES_CONFIRM: 'sales.confirm', // Cashier+
  SALES_CANCEL: 'sales.cancel', // 🔒 Manager+
  SALES_DELETE: 'sales.delete', // 🔒 Admin only
  SALES_VIEW_ALL: 'sales.view.all', // Manager+ (other users' orders)

  // ==================== PAYMENTS ====================
  PAYMENTS_VIEW: 'payments.view', // Cashier+
  PAYMENTS_CREATE: 'payments.create', // Cashier+
  PAYMENTS_SPLIT: 'payments.split', // Cashier+
  PAYMENTS_APPROVE_REFUND: 'payments.approve-refund', // 🔒 Manager only
  PAYMENTS_VOID: 'payments.void', // 🔒 Manager only
  PAYMENTS_VIEW_ALL: 'payments.view.all', // Manager+

  // ==================== SESSIONS ====================
  SESSIONS_OPEN: 'sessions.open', // Cashier+
  SESSIONS_CLOSE: 'sessions.close', // 🔒 Manager only
  SESSIONS_VIEW: 'sessions.view', // Cashier+ (own sessions)
  SESSIONS_VIEW_ALL: 'sessions.view.all', // Manager+
  SESSIONS_RECONCILE: 'sessions.reconcile', // 🔒 Manager only

  // ==================== TABLES ====================
  TABLES_VIEW: 'tables.view', // Cashier+
  TABLES_CREATE: 'tables.create', // Manager+
  TABLES_UPDATE: 'tables.update', // Manager+
  TABLES_DELETE: 'tables.delete', // 🔒 Admin only
  TABLES_ASSIGN: 'tables.assign', // Cashier+
  TABLES_TRANSFER: 'tables.transfer', // Manager+
  TABLES_CLEAN: 'tables.clean', // Cashier+
  TABLES_FLOOR_MANAGE: 'tables.floor.manage', // 🔒 Admin only
  TABLES_RESERVATION_VIEW: 'tables.reservation.view', // Cashier+
  TABLES_RESERVATION_MANAGE: 'tables.reservation.manage', // Manager+

  // ==================== KITCHEN ====================
  KITCHEN_VIEW: 'kitchen.view', // Kitchen staff
  KITCHEN_UPDATE: 'kitchen.update', // Kitchen staff
  KITCHEN_STATION_CREATE: 'kitchen.station.create', // 🔒 Admin only
  KITCHEN_STATION_UPDATE: 'kitchen.station.update', // Manager+
  KITCHEN_STATION_DELETE: 'kitchen.station.delete', // 🔒 Admin only

  // ==================== CUSTOMERS ====================
  CUSTOMERS_VIEW: 'customers.view', // Cashier+
  CUSTOMERS_CREATE: 'customers.create', // Cashier+
  CUSTOMERS_UPDATE: 'customers.update', // Cashier+
  CUSTOMERS_DELETE: 'customers.delete', // 🔒 Admin only
  CUSTOMERS_LOYALTY_VIEW: 'customers.loyalty.view', // Cashier+
  CUSTOMERS_LOYALTY_ADJUST: 'customers.loyalty.adjust', // 🔒 Manager only

  // ==================== USERS & ROLES ====================
  USERS_VIEW: 'users.view', // 🔒 Manager+
  USERS_CREATE: 'users.create', // 🔒 Admin only
  USERS_UPDATE: 'users.update', // 🔒 Admin only
  USERS_DELETE: 'users.delete', // 🔒 Admin only
  USERS_PIN_UPDATE: 'users.pin.update', // Self or Admin
  USERS_PASSWORD_CHANGE: 'users.password.change', // Self or Admin
  ROLES_VIEW: 'roles.view', // 🔒 Manager+
  ROLES_MANAGE: 'roles.manage', // 🔒 Admin only
  PERMISSIONS_VIEW: 'permissions.view', // 🔒 Admin only
  PERMISSIONS_ASSIGN: 'permissions.assign', // 🔒 Admin only

  // ==================== SETTINGS ====================
  SETTINGS_VIEW: 'settings.view', // 🔒 Manager+
  SETTINGS_UPDATE: 'settings.update', // 🔒 Admin only
  SETTINGS_TAX_VIEW: 'settings.tax.view', // Manager+
  SETTINGS_TAX_MANAGE: 'settings.tax.manage', // 🔒 Admin only
  SETTINGS_TERMINAL_VIEW: 'settings.terminal.view', // Manager+
  SETTINGS_TERMINAL_MANAGE: 'settings.terminal.manage', // 🔒 Admin only
  SETTINGS_MODULE_VIEW: 'settings.module.view', // Manager+
  SETTINGS_MODULE_MANAGE: 'settings.module.manage', // 🔒 Admin only

  // ==================== DELIVERY ====================
  DELIVERY_VIEW: 'delivery.view', // Cashier+
  DELIVERY_CREATE: 'delivery.create', // Cashier+
  DELIVERY_UPDATE: 'delivery.update', // Cashier+
  DELIVERY_ASSIGN: 'delivery.assign', // Manager+
  DELIVERY_ZONE_MANAGE: 'delivery.zone.manage', // 🔒 Admin only
  DELIVERY_PARTNER_MANAGE: 'delivery.partner.manage', // 🔒 Admin only

  // ==================== DISCOUNTS ====================
  DISCOUNTS_VIEW: 'discounts.view', // Cashier+
  DISCOUNTS_APPLY: 'discounts.apply', // Cashier+
  DISCOUNTS_CREATE: 'discounts.create', // Manager+
  DISCOUNTS_UPDATE: 'discounts.update', // Manager+
  DISCOUNTS_DELETE: 'discounts.delete', // 🔒 Admin only

  // ==================== REPORTS ====================
  REPORTS_SALES_VIEW: 'reports.sales.view', // 🔒 Manager+
  REPORTS_INVENTORY_VIEW: 'reports.inventory.view', // 🔒 Manager+
  REPORTS_FINANCIAL_VIEW: 'reports.financial.view', // 🔒 Manager+
  REPORTS_EXPORT: 'reports.export', // 🔒 Manager+

  // ==================== COMPLIANCE ====================
  COMPLIANCE_VIEW: 'compliance.view', // 🔒 Manager+
  COMPLIANCE_GENERATE: 'compliance.generate', // Cashier+
  COMPLIANCE_EXPORT: 'compliance.export', // 🔒 Manager+
  COMPLIANCE_SETTINGS: 'compliance.settings', // 🔒 Admin only

  // ==================== AUDIT ====================
  AUDIT_VIEW: 'audit.view', // 🔒 Manager+
  AUDIT_EXPORT: 'audit.export', // 🔒 Admin only
} as const;

/**
 * Type helper for permission constants
 */
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Permission groups for documentation reference
 * Actual role-permission mapping is stored in the database
 */
export const CASHIER_PERMISSIONS: Permission[] = [
  // Sales & Orders
  PERMISSIONS.SALES_VIEW,
  PERMISSIONS.SALES_CREATE,
  PERMISSIONS.SALES_UPDATE,
  PERMISSIONS.SALES_CONFIRM,

  // Payments
  PERMISSIONS.PAYMENTS_VIEW,
  PERMISSIONS.PAYMENTS_CREATE,
  PERMISSIONS.PAYMENTS_SPLIT,

  // Inventory (view + basic ops)
  PERMISSIONS.INVENTORY_VIEW,
  PERMISSIONS.INVENTORY_RECEIVE,
  PERMISSIONS.INVENTORY_TRANSFER,
  PERMISSIONS.INVENTORY_RECIPE_VIEW,

  // Products (view only)
  PERMISSIONS.PRODUCTS_VIEW,
  PERMISSIONS.CATEGORIES_VIEW,
  PERMISSIONS.MODIFIERS_VIEW,

  // Tables
  PERMISSIONS.TABLES_VIEW,
  PERMISSIONS.TABLES_ASSIGN,
  PERMISSIONS.TABLES_CLEAN,
  PERMISSIONS.TABLES_RESERVATION_VIEW,

  // Customers
  PERMISSIONS.CUSTOMERS_VIEW,
  PERMISSIONS.CUSTOMERS_CREATE,
  PERMISSIONS.CUSTOMERS_UPDATE,
  PERMISSIONS.CUSTOMERS_LOYALTY_VIEW,

  // Sessions
  PERMISSIONS.SESSIONS_OPEN,
  PERMISSIONS.SESSIONS_VIEW,

  // Kitchen
  PERMISSIONS.KITCHEN_VIEW,
  PERMISSIONS.KITCHEN_UPDATE,

  // Delivery
  PERMISSIONS.DELIVERY_VIEW,
  PERMISSIONS.DELIVERY_CREATE,
  PERMISSIONS.DELIVERY_UPDATE,

  // Discounts
  PERMISSIONS.DISCOUNTS_VIEW,
  PERMISSIONS.DISCOUNTS_APPLY,

  // Compliance
  PERMISSIONS.COMPLIANCE_GENERATE,
];

export const MANAGER_PERMISSIONS: Permission[] = [
  // All cashier permissions
  ...CASHIER_PERMISSIONS,

  // Sales (elevated)
  PERMISSIONS.SALES_CANCEL,
  PERMISSIONS.SALES_VIEW_ALL,

  // Payments (elevated)
  PERMISSIONS.PAYMENTS_APPROVE_REFUND,
  PERMISSIONS.PAYMENTS_VOID,
  PERMISSIONS.PAYMENTS_VIEW_ALL,

  // Inventory (elevated)
  PERMISSIONS.INVENTORY_ADJUST,
  PERMISSIONS.INVENTORY_RECIPE_MANAGE,

  // Products
  PERMISSIONS.PRODUCTS_CREATE,
  PERMISSIONS.PRODUCTS_UPDATE,
  PERMISSIONS.CATEGORIES_CREATE,
  PERMISSIONS.CATEGORIES_UPDATE,
  PERMISSIONS.MODIFIERS_CREATE,
  PERMISSIONS.MODIFIERS_UPDATE,

  // Tables
  PERMISSIONS.TABLES_CREATE,
  PERMISSIONS.TABLES_UPDATE,
  PERMISSIONS.TABLES_TRANSFER,
  PERMISSIONS.TABLES_RESERVATION_MANAGE,

  // Kitchen
  PERMISSIONS.KITCHEN_STATION_UPDATE,

  // Customers (elevated)
  PERMISSIONS.CUSTOMERS_LOYALTY_ADJUST,

  // Sessions (elevated)
  PERMISSIONS.SESSIONS_CLOSE,
  PERMISSIONS.SESSIONS_VIEW_ALL,
  PERMISSIONS.SESSIONS_RECONCILE,

  // Users (view only)
  PERMISSIONS.USERS_VIEW,
  PERMISSIONS.ROLES_VIEW,

  // Settings (view only)
  PERMISSIONS.SETTINGS_VIEW,
  PERMISSIONS.SETTINGS_TAX_VIEW,
  PERMISSIONS.SETTINGS_TERMINAL_VIEW,
  PERMISSIONS.SETTINGS_MODULE_VIEW,

  // Delivery
  PERMISSIONS.DELIVERY_ASSIGN,

  // Discounts
  PERMISSIONS.DISCOUNTS_CREATE,
  PERMISSIONS.DISCOUNTS_UPDATE,

  // Reports
  PERMISSIONS.REPORTS_SALES_VIEW,
  PERMISSIONS.REPORTS_INVENTORY_VIEW,
  PERMISSIONS.REPORTS_FINANCIAL_VIEW,
  PERMISSIONS.REPORTS_EXPORT,

  // Compliance
  PERMISSIONS.COMPLIANCE_VIEW,
  PERMISSIONS.COMPLIANCE_EXPORT,

  // Audit
  PERMISSIONS.AUDIT_VIEW,
];

/**
 * All permissions for admin role (use Object.values(PERMISSIONS) in practice)
 */
export const ADMIN_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);
