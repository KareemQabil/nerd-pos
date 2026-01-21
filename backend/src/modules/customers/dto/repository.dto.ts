export interface CreateCustomerAddressData {
    customerId: string;
    label: string;
    street: string;
    building?: string;
    floor?: string;
    apartment?: string;
    city: string;
    district: string;
    rating?: number;
    latitude?: number;
    longitude?: number;
    region?: string;
    postalCode?: string;
    instructions?: string;
    isDefault?: boolean;
}

export interface CreateLoyaltyTierData {
    name: string;
    nameAr: string;
    minSpent: number;
    minOrders: number;
    pointsMultiplier: number;
    discountPercent: number;
    color: string;
    icon?: string;
    displayOrder: number;
    isActive?: boolean;
}
