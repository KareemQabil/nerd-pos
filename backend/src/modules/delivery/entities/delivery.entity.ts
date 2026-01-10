// Delivery Entities
// Source: FINAL/BACKEND/15-MODULE-DELIVERY.md

export interface DeliveryZone {
    id: string;
    name: string;
    nameAr: string;
    districts: string[];
    deliveryFee: number;
    minOrderAmount?: number | null;
    freeDeliveryThreshold?: number | null;
    estimatedTime: number;
    coordinates?: any | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Driver {
    id: string;
    userId: string;
    licenseNumber: string;
    vehicleType: 'BIKE' | 'SCOOTER' | 'CAR';
    vehiclePlate: string;
    phone: string;
    status: 'OFFLINE' | 'AVAILABLE' | 'BUSY';
    latitude?: number | null;
    longitude?: number | null;
    lastLocationUpdate?: Date | null;
    totalDeliveries: number;
    rating?: number | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface Delivery {
    id: string;
    orderId: string;
    addressId: string;
    zoneId?: string | null;
    driverId?: string | null;
    deliveryFee: number;
    scheduledFor?: Date | null;
    pickedUpAt?: Date | null;
    deliveredAt?: Date | null;
    status: 'PENDING' | 'ASSIGNED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
    estimatedTime?: number | null;
    trackingNotes?: string | null;
    customerRating?: number | null;
    customerFeedback?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
