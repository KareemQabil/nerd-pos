// Settings Entities
// Source: FINAL/BACKEND/11-MODULE-SETTINGS.md

export interface StoreSetting {
    id: string;
    name: string;
    nameAr: string;
    vatNumber: string;
    crNumber: string;
    phone: string;
    email: string;
    website?: string | null;
    address: string;
    city: string;
    country: string;
    openingHours: any;
    timezone: string;
    logoUrl?: string | null;
    primaryColor: string;
    currency: string;
    currencySymbol: string;
    updatedAt: Date;
}

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

export interface ModuleSetting {
    id: string;
    module: string;
    config: any;
    updatedAt: Date;
}
