// Product Entity Type
// Matches Prisma Product model from schema.prisma

export interface Product {
    id: string;
    sku: string;
    barcode?: string | null;
    nameAr: string;
    nameEn: string;
    descriptionAr?: string | null;
    descriptionEn?: string | null;
    categoryId: string;
    price: number; // Stored as Decimal in DB, converted via interceptor
    cost: number;
    taxCategory: string;
    unitOfMeasure: string;
    trackInventory: boolean;
    allowNegativeStock: boolean;
    hasModifiers: boolean;
    replenishmentMethod: string; // BUY | MAKE_TO_ORDER | MAKE_TO_STOCK
    kitchenStationId?: string | null;
    incomeAccountId?: string | null;
    expenseAccountId?: string | null;
    preparationTimeMinutes?: number | null;
    imageUrl?: string | null;
    colorCode?: string | null;
    isActive: boolean;
    customFields?: any;
    createdAt: Date;
    updatedAt: Date;
}

export interface Category {
    id: string;
    parentId?: string | null;
    nameAr: string;
    nameEn: string;
    imageUrl?: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
