// Settings Entities
// Source: FINAL/BACKEND/11-MODULE-SETTINGS.md
// Aligned with: prisma/schema.prisma

// ==================== STORE SETTINGS ====================

export interface StoreSettings {
  id: string;
  nameAr: string; // Matches schema
  nameEn: string; // Matches schema
  taxNumber: string; // Matches schema
  taxRate: number; // Decimal in DB
  serviceCharge: number; // Decimal in DB
  currency: string; // SAR
  timezone: string; // Asia/Riyadh
  locale: string; // ar-SA
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo?: string | null;
  createdAt: Date;
  updatedAt: Date;

  // Backward-compatible aliases
  name?: string; // Alias for nameEn
  vatNumber?: string; // Alias for taxNumber
  logoUrl?: string | null; // Alias for logo
  crNumber?: string; // Not in schema
  website?: string | null; // Not in schema
  city?: string; // Not in schema
  country?: string; // Not in schema
  openingHours?: any; // Not in schema
  primaryColor?: string; // Not in schema
  currencySymbol?: string; // Not in schema
}

// Backward-compatible alias
export type StoreSetting = StoreSettings;

// ==================== TAX SETTING ====================
// Note: TaxSetting model not in current schema - taxRate is on StoreSettings

export interface TaxSetting {
  id: string;
  name: string;
  nameAr: string;
  rate: number;
  isDefault: boolean;
  applyToProducts: boolean;
  applyToServices: boolean;
  exemptCategories: string[];
  isActive: boolean;
  displayOrder: number;
}

// ==================== POS TERMINAL ====================
// Note: POSTerminal model not in current schema

export interface POSTerminal {
  id: string;
  name: string;
  nameAr: string;
  code: string;
  ipAddress?: string | null;
  macAddress?: string | null;
  receiptPrinter?: any;
  kitchenPrinter?: any;
  labelPrinter?: any;
  cashDrawerPort?: string | null;
  customerDisplay?: any;
  autoOpenDrawer: boolean;
  printReceipt: boolean;
  printKitchen: boolean;
  currentSessionId?: string | null;
  isActive: boolean;
  lastSeenAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== MODULE SETTING ====================
// Note: ModuleSetting model not in current schema

export interface ModuleSetting {
  id: string;
  module: string;
  config: any;
  updatedAt: Date;
}
