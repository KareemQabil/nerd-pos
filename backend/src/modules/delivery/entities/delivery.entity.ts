// Delivery Entities
// Source: FINAL/BACKEND/15-MODULE-DELIVERY.md
// Aligned with: prisma/schema.prisma (existing models)

import { Prisma } from '@prisma/client';

type Decimal = Prisma.Decimal;

// ==================== DELIVERY ZONE ====================

export interface DeliveryZone {
  id: string;
  name: string; // Matches schema
  nameAr: string; // Matches schema
  districts: string[];
  deliveryFee: Decimal | number; // Decimal in DB
  minOrderAmount?: Decimal | number | null;
  freeDeliveryThreshold?: Decimal | number | null;
  estimatedTime: number;
  coordinates?: any | null; // GeoJSON
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  // Backward-compatible alias
  nameEn?: string; // Alias for name
}

// ==================== DRIVER ====================

export interface Driver {
  id: string;
  userId: string;
  licenseNumber: string;
  vehicleType: string; // BIKE, SCOOTER, CAR
  vehiclePlate: string;
  phone: string;
  status: string; // OFFLINE, AVAILABLE, BUSY
  latitude?: Decimal | number | null;
  longitude?: Decimal | number | null;
  lastLocationUpdate?: Date | null;
  totalDeliveries: number;
  rating?: Decimal | number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== DELIVERY ====================

export interface Delivery {
  id: string;
  orderId: string;
  addressId?: string | null;
  zoneId?: string | null;
  driverId?: string | null;
  deliveryFee: Decimal | number; // Decimal in DB
  estimatedTime?: number | null; // minutes
  scheduledFor?: Date | null;
  dispatchedAt?: Date | null;
  pickedUpAt?: Date | null;
  deliveredAt?: Date | null;
  status: string; // PENDING, ASSIGNED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED
  estimatedArrival?: Date | null;
  trackingNotes?: string | null;
  instructions?: string | null;
  customerRating?: number | null;
  customerFeedback?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
