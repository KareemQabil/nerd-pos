// Tables Repository
// Source: FINAL/BACKEND/12-MODULE-TABLES.md, 08-repository.md

import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Floor, FloorWithTables, Table, TableWithFloor, TableReservation } from './entities/tables.entity';

@Injectable()
export class TablesRepository extends BaseRepository<Table> {
    constructor(prisma: PrismaService) {
        super(prisma);
    }

    protected get model() {
        return 'table';
    }

    // ==================== FLOORS ====================

    async findAllFloors(): Promise<Floor[]> {
        return (this.prisma as any).floor.findMany({
            where: { isActive: true },
            orderBy: { displayOrder: 'asc' },
        });
    }

    async findFloorById(id: string): Promise<Floor | null> {
        return (this.prisma as any).floor.findUnique({
            where: { id },
        });
    }

    async findFloorWithTables(id: string): Promise<FloorWithTables | null> {
        return (this.prisma as any).floor.findUnique({
            where: { id },
            include: {
                tables: {
                    where: { isActive: true },
                    orderBy: { number: 'asc' },
                },
            },
        });
    }

    async createFloor(data: any): Promise<Floor> {
        return (this.prisma as any).floor.create({ data });
    }

    async updateFloor(id: string, data: any): Promise<Floor> {
        return (this.prisma as any).floor.update({
            where: { id },
            data,
        });
    }

    // ==================== TABLES ====================

    async findByFloor(floorId: string): Promise<Table[]> {
        return (this.prisma as any).table.findMany({
            where: { floorId, isActive: true },
            orderBy: { number: 'asc' },
        });
    }

    async findAvailable(floorId?: string): Promise<Table[]> {
        const where: any = { status: 'AVAILABLE', isActive: true };
        if (floorId) {
            where.floorId = floorId;
        }
        return (this.prisma as any).table.findMany({
            where,
            include: { floor: true },
            orderBy: { number: 'asc' },
        });
    }

    async findOccupied(floorId?: string): Promise<Table[]> {
        const where: any = { status: 'OCCUPIED', isActive: true };
        if (floorId) {
            where.floorId = floorId;
        }
        return (this.prisma as any).table.findMany({
            where,
            include: { floor: true },
            orderBy: { number: 'asc' },
        });
    }

    async findByNumber(floorId: string, number: string): Promise<Table | null> {
        return (this.prisma as any).table.findFirst({
            where: { floorId, number },
        });
    }

    async findByWaiter(waiterId: string): Promise<Table[]> {
        return (this.prisma as any).table.findMany({
            where: { waiterId, isActive: true },
            include: { floor: true },
        });
    }

    // ==================== RESERVATIONS ====================

    async findReservationById(id: string): Promise<TableReservation | null> {
        return (this.prisma as any).tableReservation.findUnique({
            where: { id },
        });
    }

    async findTodayReservations(): Promise<TableReservation[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return (this.prisma as any).tableReservation.findMany({
            where: {
                reservedFor: { gte: today, lt: tomorrow },
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
            include: { table: true },
            orderBy: { reservedFor: 'asc' },
        });
    }

    async findReservationsByTable(tableId: string, date: Date): Promise<TableReservation[]> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return (this.prisma as any).tableReservation.findMany({
            where: {
                tableId,
                reservedFor: { gte: startOfDay, lte: endOfDay },
                status: { in: ['PENDING', 'CONFIRMED'] },
            },
            orderBy: { reservedFor: 'asc' },
        });
    }

    async createReservation(data: any): Promise<TableReservation> {
        return (this.prisma as any).tableReservation.create({ data });
    }

    async updateReservation(id: string, data: any): Promise<TableReservation> {
        return (this.prisma as any).tableReservation.update({
            where: { id },
            data,
        });
    }

    async findReservationConflicts(
        tableId: string,
        reservedFor: Date,
        duration: number,
    ): Promise<TableReservation[]> {
        const endTime = new Date(reservedFor.getTime() + duration * 60000);

        return (this.prisma as any).tableReservation.findMany({
            where: {
                tableId,
                status: { in: ['PENDING', 'CONFIRMED'] },
                OR: [
                    {
                        reservedFor: { lte: reservedFor },
                        // Need raw query for proper overlap check
                    },
                ],
            },
        });
    }
}
