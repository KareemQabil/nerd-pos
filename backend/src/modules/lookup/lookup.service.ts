/**
 * Lookup Service
 * Production Cleanup 2026-01-23
 *
 * Provides generic lookup data for dropdowns.
 * Follows: FINAL/BACKEND/02-CORE-PATTERNS.md - Repository Pattern
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { LookupQueryDto, LookupItem } from '../../common/dto/lookup.dto';

@Injectable()
export class LookupService {
    constructor(private readonly prisma: PrismaService) { }

    async getCategories(dto: LookupQueryDto): Promise<LookupItem[]> {
        const categories = await this.prisma.category.findMany({
            where: {
                isActive: true,
                ...(dto.search && {
                    OR: [
                        { nameEn: { contains: dto.search, mode: 'insensitive' } },
                        { nameAr: { contains: dto.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                nameEn: true,
                nameAr: true,
                isActive: true,
            },
            take: dto.limit || 50,
            orderBy: { sortOrder: 'asc' },
        });

        return categories.map((cat) => ({
            id: cat.id,
            nameEn: cat.nameEn,
            nameAr: cat.nameAr,
            active: cat.isActive,
        }));
    }

    async getProducts(dto: LookupQueryDto): Promise<LookupItem[]> {
        const products = await this.prisma.product.findMany({
            where: {
                isActive: true,
                ...(dto.parentId && { categoryId: dto.parentId }),
                ...(dto.search && {
                    OR: [
                        { nameEn: { contains: dto.search, mode: 'insensitive' } },
                        { nameAr: { contains: dto.search, mode: 'insensitive' } },
                        { sku: { contains: dto.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                nameEn: true,
                nameAr: true,
                sku: true,
                price: true,
                isActive: true,
            },
            take: dto.limit || 50,
            orderBy: { nameEn: 'asc' },
        });

        return products.map((prod) => ({
            id: prod.id,
            nameEn: prod.nameEn,
            nameAr: prod.nameAr,
            active: prod.isActive,
            metadata: {
                sku: prod.sku,
                price: prod.price.toString(),
            },
        }));
    }

    async getTables(dto: LookupQueryDto): Promise<LookupItem[]> {
        const tables = await this.prisma.table.findMany({
            where: {
                isActive: true,
                ...(dto.parentId && { floorId: dto.parentId }),
                ...(dto.search && {
                    OR: [{ number: { contains: dto.search, mode: 'insensitive' } }],
                }),
            },
            select: {
                id: true,
                number: true,
                capacity: true,
                status: true,
            },
            take: dto.limit || 50,
            orderBy: { number: 'asc' },
        });

        return tables.map((table) => ({
            id: table.id,
            nameEn: `Table ${table.number}`,
            nameAr: `طاولة ${table.number}`,
            active: true,
            metadata: {
                number: table.number,
                capacity: table.capacity,
                status: table.status,
            },
        }));
    }

    async getFloors(dto: LookupQueryDto): Promise<LookupItem[]> {
        const floors = await this.prisma.floor.findMany({
            where: {
                isActive: true,
                ...(dto.search && {
                    OR: [
                        { name: { contains: dto.search, mode: 'insensitive' } },
                        { nameAr: { contains: dto.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                name: true,
                nameAr: true,
                displayOrder: true,
            },
            orderBy: { displayOrder: 'asc' },
        });

        return floors.map((floor) => ({
            id: floor.id,
            nameEn: floor.name,
            nameAr: floor.nameAr,
            active: true,
        }));
    }

    async getUsers(dto: LookupQueryDto): Promise<LookupItem[]> {
        const users = await this.prisma.user.findMany({
            where: {
                isActive: true,
                ...(dto.role && { role: dto.role }),
                ...(dto.search && {
                    OR: [
                        { nameEn: { contains: dto.search, mode: 'insensitive' } },
                        { nameAr: { contains: dto.search, mode: 'insensitive' } },
                        { username: { contains: dto.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                nameEn: true,
                nameAr: true,
                username: true,
                role: true,
                isActive: true,
            },
            take: dto.limit || 50,
            orderBy: { nameEn: 'asc' },
        });

        return users.map((user) => ({
            id: user.id,
            nameEn: user.nameEn,
            nameAr: user.nameAr,
            active: user.isActive,
            metadata: {
                username: user.username,
                role: user.role,
            },
        }));
    }

    async getCustomers(dto: LookupQueryDto): Promise<LookupItem[]> {
        const customers = await this.prisma.customer.findMany({
            where: {
                isActive: true,
                ...(dto.search && {
                    OR: [
                        { nameEn: { contains: dto.search, mode: 'insensitive' } },
                        { nameAr: { contains: dto.search, mode: 'insensitive' } },
                        { phone: { contains: dto.search, mode: 'insensitive' } },
                        { code: { contains: dto.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                nameEn: true,
                nameAr: true,
                phone: true,
                code: true,
                loyaltyPoints: true,
            },
            take: dto.limit || 50,
            orderBy: { nameEn: 'asc' },
        });

        return customers.map((customer) => ({
            id: customer.id,
            nameEn: customer.nameEn,
            nameAr: customer.nameAr,
            active: true,
            metadata: {
                phone: customer.phone,
                code: customer.code,
                loyaltyPoints: customer.loyaltyPoints,
            },
        }));
    }

    async getKitchenStations(dto: LookupQueryDto): Promise<LookupItem[]> {
        const stations = await this.prisma.kitchenStation.findMany({
            where: {
                isActive: true,
                ...(dto.search && {
                    OR: [
                        { name: { contains: dto.search, mode: 'insensitive' } },
                        { nameAr: { contains: dto.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                name: true,
                nameAr: true,
                color: true,
                isActive: true,
            },
            orderBy: { displayOrder: 'asc' },
        });

        return stations.map((station) => ({
            id: station.id,
            nameEn: station.name,
            nameAr: station.nameAr,
            active: station.isActive,
            metadata: {
                color: station.color,
            },
        }));
    }

    async getModifierGroups(dto: LookupQueryDto): Promise<LookupItem[]> {
        const groups = await this.prisma.modifierGroup.findMany({
            where: {
                isActive: true,
                ...(dto.search && {
                    OR: [
                        { nameEn: { contains: dto.search, mode: 'insensitive' } },
                        { nameAr: { contains: dto.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                nameEn: true,
                nameAr: true,
                isActive: true,
                isRequired: true,
            },
            orderBy: { sortOrder: 'asc' },
        });

        return groups.map((group) => ({
            id: group.id,
            nameEn: group.nameEn,
            nameAr: group.nameAr,
            active: group.isActive,
            metadata: {
                isRequired: group.isRequired,
            },
        }));
    }

    async getWarehouses(dto: LookupQueryDto): Promise<LookupItem[]> {
        const warehouses = await this.prisma.warehouse.findMany({
            where: {
                isActive: true,
                ...(dto.search && {
                    OR: [
                        { nameEn: { contains: dto.search, mode: 'insensitive' } },
                        { nameAr: { contains: dto.search, mode: 'insensitive' } },
                        { code: { contains: dto.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                nameEn: true,
                nameAr: true,
                code: true,
                isDefault: true,
                isActive: true,
            },
            orderBy: { code: 'asc' },
        });

        return warehouses.map((wh) => ({
            id: wh.id,
            nameEn: wh.nameEn,
            nameAr: wh.nameAr,
            active: wh.isActive,
            metadata: {
                code: wh.code,
                isDefault: wh.isDefault,
            },
        }));
    }

    async getDeliveryZones(dto: LookupQueryDto): Promise<LookupItem[]> {
        const zones = await this.prisma.deliveryZone.findMany({
            where: {
                isActive: true,
                ...(dto.search && {
                    OR: [
                        { name: { contains: dto.search, mode: 'insensitive' } },
                        { nameAr: { contains: dto.search, mode: 'insensitive' } },
                    ],
                }),
            },
            select: {
                id: true,
                name: true,
                nameAr: true,
                deliveryFee: true,
                estimatedTime: true,
                isActive: true,
            },
            orderBy: { name: 'asc' },
        });

        return zones.map((zone) => ({
            id: zone.id,
            nameEn: zone.name,
            nameAr: zone.nameAr,
            active: zone.isActive,
            metadata: {
                deliveryFee: zone.deliveryFee.toString(),
                estimatedTime: zone.estimatedTime,
            },
        }));
    }

    // Static enum-based lookups
    getPaymentMethods(): LookupItem[] {
        return [
            { id: 'CASH', nameEn: 'Cash', nameAr: 'نقدي', active: true },
            {
                id: 'CARD',
                nameEn: 'Credit/Debit Card',
                nameAr: 'بطاقة ائتمان',
                active: true,
            },
            {
                id: 'DIGITAL_WALLET',
                nameEn: 'Digital Wallet',
                nameAr: 'محفظة رقمية',
                active: true,
            },
            {
                id: 'BANK_TRANSFER',
                nameEn: 'Bank Transfer',
                nameAr: 'حوالة بنكية',
                active: true,
            },
        ];
    }

    getOrderTypes(): LookupItem[] {
        return [
            { id: 'DINE_IN', nameEn: 'Dine In', nameAr: 'داخل المطعم', active: true },
            { id: 'TAKEOUT', nameEn: 'Takeout', nameAr: 'طلب خارجي', active: true },
            { id: 'DELIVERY', nameEn: 'Delivery', nameAr: 'توصيل', active: true },
            {
                id: 'DRIVE_THRU',
                nameEn: 'Drive Thru',
                nameAr: 'طلب سيارات',
                active: true,
            },
        ];
    }

    getOrderStatuses(): LookupItem[] {
        return [
            { id: 'DRAFT', nameEn: 'Draft', nameAr: 'مسودة', active: true },
            { id: 'PENDING', nameEn: 'Pending', nameAr: 'قيد الانتظار', active: true },
            { id: 'CONFIRMED', nameEn: 'Confirmed', nameAr: 'مؤكد', active: true },
            {
                id: 'IN_PROGRESS',
                nameEn: 'In Progress',
                nameAr: 'قيد التحضير',
                active: true,
            },
            { id: 'READY', nameEn: 'Ready', nameAr: 'جاهز', active: true },
            { id: 'COMPLETED', nameEn: 'Completed', nameAr: 'مكتمل', active: true },
            { id: 'CANCELLED', nameEn: 'Cancelled', nameAr: 'ملغي', active: true },
            { id: 'REFUNDED', nameEn: 'Refunded', nameAr: 'مسترجع', active: true },
        ];
    }

    getTableStatuses(): LookupItem[] {
        return [
            { id: 'AVAILABLE', nameEn: 'Available', nameAr: 'متاحة', active: true },
            { id: 'OCCUPIED', nameEn: 'Occupied', nameAr: 'مشغولة', active: true },
            { id: 'RESERVED', nameEn: 'Reserved', nameAr: 'محجوزة', active: true },
            {
                id: 'CLEANING',
                nameEn: 'Cleaning',
                nameAr: 'قيد التنظيف',
                active: true,
            },
            {
                id: 'OUT_OF_SERVICE',
                nameEn: 'Out of Service',
                nameAr: 'خارج الخدمة',
                active: true,
            },
        ];
    }

    getDiscountTypes(): LookupItem[] {
        return [
            { id: 'PERCENTAGE', nameEn: 'Percentage', nameAr: 'نسبة مئوية', active: true },
            { id: 'FIXED', nameEn: 'Fixed Amount', nameAr: 'مبلغ ثابت', active: true },
        ];
    }
}
