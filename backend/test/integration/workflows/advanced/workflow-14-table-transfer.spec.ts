/**
 * Workflow 14: Table Transfer
 * 
 * Source: WORKFLOWS.md - Advanced Workflows
 * Tests moving orders between tables
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TablesService } from '../../../../src/modules/tables/tables.service';
import { TablesRepository } from '../../../../src/modules/tables/tables.repository';

function createMockRepository() {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        findAllFloors: jest.fn(),
        findFloorWithTables: jest.fn(),
        createFloor: jest.fn(),
        updateFloor: jest.fn(),
        findByFloor: jest.fn(),
        findAvailable: jest.fn(),
        findOccupied: jest.fn(),
        createReservation: jest.fn(),
        findReservationConflicts: jest.fn(),
        updateReservation: jest.fn(),
        findTodayReservations: jest.fn(),
        findReservationsByTable: jest.fn(),
    };
}

function createMockEventBus() {
    return { publish: jest.fn(), subscribe: jest.fn() };
}

describe('Workflow 14: Table Transfer', () => {
    let service: TablesService;
    let repo: ReturnType<typeof createMockRepository>;
    let eventBus: ReturnType<typeof createMockEventBus>;

    beforeEach(async () => {
        repo = createMockRepository();
        eventBus = createMockEventBus();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TablesService,
                { provide: TablesRepository, useValue: repo },
                { provide: 'IEventBus', useValue: eventBus },
            ],
        }).compile();

        service = module.get<TablesService>(TablesService);
    });

    afterEach(() => jest.clearAllMocks());

    // ==================== 14.1: SUCCESSFUL TRANSFER ====================
    describe('14.1: Successful Transfer', () => {
        it('should transfer order from table to another', async () => {
            const fromTable = { id: 'table-5', number: 5, status: 'OCCUPIED', currentOrderId: 'order-1' };
            const toTable = { id: 'table-8', number: 8, status: 'AVAILABLE', currentOrderId: null };

            repo.findById
                .mockResolvedValueOnce(fromTable)
                .mockResolvedValueOnce(toTable);
            repo.update.mockResolvedValue({});

            await service.transferTable({
                fromTableId: 'table-5',
                toTableId: 'table-8',
                orderId: 'order-1',
            });

            expect(repo.update).toHaveBeenCalledWith('table-5', expect.objectContaining({
                status: 'AVAILABLE',
                currentOrderId: null,
            }));
            expect(repo.update).toHaveBeenCalledWith('table-8', expect.objectContaining({
                status: 'OCCUPIED',
                currentOrderId: 'order-1',
            }));
        });

        it('should publish TableTransferred event', async () => {
            repo.findById
                .mockResolvedValueOnce({ id: 'table-5', status: 'OCCUPIED' })
                .mockResolvedValueOnce({ id: 'table-8', status: 'AVAILABLE' });
            repo.update.mockResolvedValue({});

            await service.transferTable({
                fromTableId: 'table-5',
                toTableId: 'table-8',
                orderId: 'order-1',
            });

            expect(eventBus.publish).toHaveBeenCalledWith('TableTransferred', expect.anything());
        });
    });

    // ==================== 14.2: VALIDATION ====================
    describe('14.2: Validation', () => {
        it('should throw if target table not available', async () => {
            repo.findById
                .mockResolvedValueOnce({ id: 'table-5', status: 'OCCUPIED' })
                .mockResolvedValueOnce({ id: 'table-8', status: 'OCCUPIED', number: 8 }); // Already occupied

            await expect(service.transferTable({
                fromTableId: 'table-5',
                toTableId: 'table-8',
                orderId: 'order-1',
            })).rejects.toThrow(BadRequestException);
        });

        it('should throw if table not found', async () => {
            repo.findById.mockResolvedValueOnce(null);

            await expect(service.transferTable({
                fromTableId: 'nonexistent',
                toTableId: 'table-8',
                orderId: 'order-1',
            })).rejects.toThrow(NotFoundException);
        });
    });

    // ==================== 14.3: TABLE ASSIGNMENT ====================
    describe('14.3: Table Assignment', () => {
        it('should assign order to table', async () => {
            repo.findById.mockResolvedValue({ id: 'table-5', number: 5, status: 'AVAILABLE' });
            repo.update.mockResolvedValue({ id: 'table-5', status: 'OCCUPIED', currentOrderId: 'order-1' });

            const result = await service.assignOrderToTable('table-5', 'order-1');

            expect(result.status).toBe('OCCUPIED');
            expect(eventBus.publish).toHaveBeenCalledWith('TableOccupied', expect.anything());
        });

        it('should release table after order', async () => {
            repo.findById.mockResolvedValue({ id: 'table-5', number: 5, status: 'OCCUPIED' });
            repo.update.mockResolvedValue({ id: 'table-5', status: 'DIRTY', currentOrderId: null });

            const result = await service.releaseTable('table-5');

            expect(result.status).toBe('DIRTY');
            expect(eventBus.publish).toHaveBeenCalledWith('TableReleased', expect.anything());
        });

        it('should mark table clean', async () => {
            repo.update.mockResolvedValue({ id: 'table-5', status: 'AVAILABLE' });

            const result = await service.markTableClean('table-5');

            expect(result.status).toBe('AVAILABLE');
        });
    });
});
