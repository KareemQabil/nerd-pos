/**
 * Audit Service Unit Tests
 * 
 * Tests for audit logging service that tracks all system changes.
 * AuditService uses Prisma directly (no repository pattern).
 */

import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../../core/prisma/prisma.service';

function createMockPrisma() {
    return {
        auditLog: {
            create: jest.fn(),
            findMany: jest.fn(),
        },
    };
}

describe('AuditService', () => {
    let service: AuditService;
    let prisma: ReturnType<typeof createMockPrisma>;

    beforeEach(async () => {
        prisma = createMockPrisma();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: PrismaService, useValue: prisma },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
    });

    afterEach(() => jest.clearAllMocks());

    // ==================== LOG ====================
    describe('log', () => {
        it('should create audit log entry', async () => {
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            await service.log({
                userId: 'user-1',
                username: 'admin',
                action: 'CREATE',
                entity: 'Product',
                entityId: 'prod-1',
                module: 'products',
                success: true,
            });

            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    userId: 'user-1',
                    action: 'CREATE',
                    entity: 'Product',
                    entityId: 'prod-1',
                    module: 'products',
                    businessDate: expect.any(Date),
                }),
            });
        });

        it('should calculate changes when before and after provided', async () => {
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            await service.log({
                userId: 'user-1',
                username: 'admin',
                action: 'UPDATE',
                entity: 'Product',
                entityId: 'prod-1',
                module: 'products',
                before: { name: 'Old Name', price: 100 },
                after: { name: 'New Name', price: 100 },
                success: true,
            });

            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    changes: { name: { from: 'Old Name', to: 'New Name' } },
                }),
            });
        });

        it('should set changes to null when no before/after', async () => {
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            await service.log({
                userId: 'user-1',
                username: 'admin',
                action: 'DELETE',
                entity: 'Product',
                entityId: 'prod-1',
                module: 'products',
                success: true,
            });

            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    changes: null,
                }),
            });
        });
    });

    // ==================== FIND BY ENTITY ====================
    describe('findByEntity', () => {
        it('should find audit logs by entity type and ID', async () => {
            const mockLogs = [
                { id: 'log-1', action: 'CREATE', createdAt: new Date() },
                { id: 'log-2', action: 'UPDATE', createdAt: new Date() },
            ];
            prisma.auditLog.findMany.mockResolvedValue(mockLogs);

            const result = await service.findByEntity('Product', 'prod-1');

            expect(result).toHaveLength(2);
            expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
                where: { entity: 'Product', entityId: 'prod-1' },
                orderBy: { createdAt: 'desc' },
            });
        });

        it('should return empty array if no logs found', async () => {
            prisma.auditLog.findMany.mockResolvedValue([]);

            const result = await service.findByEntity('Product', 'nonexistent');

            expect(result).toHaveLength(0);
        });
    });

    // ==================== FIND BY USER ====================
    describe('findByUser', () => {
        it('should find audit logs by user within date range', async () => {
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-01-31');
            const mockLogs = [
                { id: 'log-1', userId: 'user-1', action: 'CREATE' },
            ];
            prisma.auditLog.findMany.mockResolvedValue(mockLogs);

            const result = await service.findByUser('user-1', startDate, endDate);

            expect(result).toHaveLength(1);
            expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    createdAt: { gte: startDate, lte: endDate },
                },
                orderBy: { createdAt: 'desc' },
            });
        });
    });

    // ==================== FIND BY MODULE ====================
    describe('findByModule', () => {
        it('should find audit logs by module within date range', async () => {
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-01-31');
            const mockLogs = [
                { id: 'log-1', module: 'products', action: 'CREATE' },
                { id: 'log-2', module: 'products', action: 'UPDATE' },
            ];
            prisma.auditLog.findMany.mockResolvedValue(mockLogs);

            const result = await service.findByModule('products', startDate, endDate);

            expect(result).toHaveLength(2);
            expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
                where: {
                    module: 'products',
                    createdAt: { gte: startDate, lte: endDate },
                },
                orderBy: { createdAt: 'desc' },
            });
        });
    });

    // ==================== CALCULATE DIFF (PRIVATE BUT TESTED VIA LOG) ====================
    describe('calculateDiff (via log)', () => {
        it('should detect multiple field changes', async () => {
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            await service.log({
                userId: 'user-1',
                username: 'admin',
                action: 'UPDATE',
                entity: 'Product',
                entityId: 'prod-1',
                module: 'products',
                before: { name: 'Old', price: 100, active: true },
                after: { name: 'New', price: 150, active: true },
                success: true,
            });

            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    changes: {
                        name: { from: 'Old', to: 'New' },
                        price: { from: 100, to: 150 },
                    },
                }),
            });
        });

        it('should handle nested object changes', async () => {
            prisma.auditLog.create.mockResolvedValue({ id: 'log-1' });

            await service.log({
                userId: 'user-1',
                username: 'admin',
                action: 'UPDATE',
                entity: 'Settings',
                entityId: 'settings-1',
                module: 'settings',
                before: { config: { theme: 'light' } },
                after: { config: { theme: 'dark' } },
                success: true,
            });

            expect(prisma.auditLog.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    changes: {
                        config: { from: { theme: 'light' }, to: { theme: 'dark' } },
                    },
                }),
            });
        });
    });
});
