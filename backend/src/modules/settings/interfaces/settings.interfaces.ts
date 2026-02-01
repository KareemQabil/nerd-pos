/**
 * Settings Interfaces
 * BLOCK 3: Type definitions for JSON fields in settings entities
 */

// ==================== OPENING HOURS ====================

export interface DayHours {
  open: string; // "09:00"
  close: string; // "22:00"
  closed: boolean;
}

export interface OpeningHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

// ==================== PRINTER CONFIG ====================

export interface PrinterConfig {
  id?: string;
  name: string;
  type: 'RECEIPT' | 'KITCHEN' | 'LABEL';
  connectionType: 'USB' | 'NETWORK' | 'BLUETOOTH';
  ipAddress?: string;
  port?: number;
  enabled: boolean;
  paperWidth?: number;
}

// ==================== CUSTOMER DISPLAY ====================

export interface CustomerDisplayConfig {
  enabled: boolean;
  port?: string;
  baudRate?: number;
  lineLength?: number;
  welcomeMessage?: string;
  welcomeMessageAr?: string;
}

// ==================== MODULE CONFIG ====================

export interface ModuleConfig {
  [key: string]: unknown;
}

// ==================== SPECIFIC MODULE CONFIGS ====================

export interface InventoryModuleConfig {
  lowStockThreshold: number;
  enableFIFO: boolean;
  autoReorder: boolean;
}

export interface KitchenModuleConfig {
  autoRoutingEnabled: boolean;
  defaultPrepTime: number;
  notificationSound: boolean;
}

export interface LoyaltyModuleConfig {
  pointsPerSAR: number;
  pointsToSAR: number;
  minRedemption: number;
}

export interface SalesModuleConfig {
  allowNegativeInventory: boolean;
  requireCustomer: boolean;
  autoApplyDiscounts: boolean;
}

export interface PaymentsModuleConfig {
  defaultMethod: 'CASH' | 'CARD' | 'MOBILE';
  enableTips: boolean;
  enableRounding: boolean;
  roundingPrecision: number;
}

export interface SessionsModuleConfig {
  autoCloseTime: string | null;
  varianceThreshold: number;
  requireBlindCount: boolean;
}
