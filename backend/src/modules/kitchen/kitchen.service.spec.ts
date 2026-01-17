/**
 * KitchenService Unit Tests
 * Source: FINAL/WORKFLOWS-BACKEND/07-testing.md
 * Phase 2 - Unit Testing
 * 
 * BRD Coverage: BR-005 (Kitchen Operations)
 * Applied Error Fixing Workflow:
 * - Verified priority: DINE_IN=100, DELIVERY=80, default=50
 * - Verified bumpItem uses updateItem with status='READY'
 * - Verified bumpItem uses findWithItems
 */
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { KitchenRepository } from './kitchen.repository';
import { KitchenGateway } from './kitchen.gateway';

// Mock Repository - verified from kitchen.repository.ts
function createMockRepository() {
    return {
        create: jest.fn(),
        findById: jest.fn(),
        update: jest.fn(),
        findWithItems: jest.fn(),
        findByOrder: jest.fn(),
        findActive: jest.fn(),
        findByStation: jest.fn(),
        countByPrefix: jest.fn(),
        addItem: jest.fn(),
        updateItem: jest.fn(),
        findItemsByTicket: jest.fn(),
        findAllStations: jest.fn(),
        findStationById: jest.fn(),
        findStationByCategory: jest.fn(),
        createStation: jest.fn(),
        updateStation: jest.fn(),
        getStationStats: jest.fn(),
    };
}

function createMockEventBus() {
    return { publish: jest.fn(), subscribe: jest.fn() };
}

// WebSocket Gateway mock - verified from kitchen.gateway.ts
function createMockGateway() {
    return {
        emitToStation: jest.fn(), // Method from kitchen.gateway.ts line 322
    };
}

describe('KitchenService', () => {
    let service: KitchenService;
    let repo: ReturnType<typeof createMockRepository>;
    let eventBus: ReturnType<typeof createMockEventBus>;
    let gateway: ReturnType<typeof createMockGateway>;

    beforeEach(async () => {
        repo = createMockRepository();
        eventBus = createMockEventBus();
        gateway = createMockGateway();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                KitchenService,
                { provide: KitchenRepository, useValue: repo },
                { provide: 'IEventBus', useValue: eventBus },
                { provide: KitchenGateway, useValue: gateway },
            ],
        }).compile();

        service = module.get<KitchenService>(KitchenService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    // ==================== PRIORITY CALCULATION (verified line 118-129) ====================

    describe('calculatePriority', () => {
        it('should return 100 for DINE_IN (highest priority)', () => {
            const calculatePriority = (service as any).calculatePriority.bind(service);
            expect(calculatePriority('DINE_IN')).toBe(100);
        });

        it('should return 80 for DELIVERY', () => {
            const calculatePriority = (service as any).calculatePriority.bind(service);
            expect(calculatePriority('DELIVERY')).toBe(80);
        });

        it('should return 50 for other types (default)', () => {
            const calculatePriority = (service as any).calculatePriority.bind(service);
            expect(calculatePriority('PICKUP')).toBe(50);
        });
    });

    // ==================== TICKET LIFECYCLE ====================

    describe('startPreparation', () => {
        it('should update ticket status to PREPARING', async () => {
            const ticket = { id: 'ticket-1', status: 'NEW', stationId: 'station-1', orderId: 'order-1' };
            const updatedTicket = { ...ticket, status: 'PREPARING', startedAt: new Date() };

            repo.findById.mockResolvedValue(ticket);
            repo.update.mockResolvedValue(updatedTicket);

            const result = await service.startPreparation('ticket-1');

            expect(result.status).toBe('PREPARING');
            expect(gateway.emitToStation).toHaveBeenCalledWith('station-1', 'ticketStarted', expect.anything());
            expect(eventBus.publish).toHaveBeenCalledWith('TicketStarted', expect.anything());
        });

        it('should throw NotFoundException for non-existent ticket', async () => {
            repo.findById.mockResolvedValue(null);
            await expect(service.startPreparation('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('markTicketReady', () => {
        it('should update ticket status to READY', async () => {
            const ticket = { id: 'ticket-1', status: 'PREPARING' };
            const readyTicket = { ...ticket, status: 'READY' };

            repo.findById.mockResolvedValue(ticket);
            repo.update.mockResolvedValue(readyTicket);

            const result = await service.markTicketReady('ticket-1');

            expect(result.status).toBe('READY');
        });
    });

    describe('completeTicket', () => {
        it('should complete ticket and emit OrderPrepared when all done', async () => {
            const ticket = { id: 'ticket-1', status: 'READY', orderId: 'order-1', stationId: 'station-1' };
            const completedTicket = { ...ticket, status: 'COMPLETED', completedAt: new Date() };

            repo.findById.mockResolvedValue(ticket);
            repo.update.mockResolvedValue(completedTicket);
            repo.findByOrder.mockResolvedValue([completedTicket]); // All tickets complete

            const result = await service.completeTicket('ticket-1');

            expect(result.status).toBe('COMPLETED');
            expect(eventBus.publish).toHaveBeenCalledWith('TicketCompleted', expect.anything());
            expect(eventBus.publish).toHaveBeenCalledWith('OrderPrepared', expect.anything());
        });
    });

    // ==================== BUMP BAR (verified line 201-219) ====================

    describe('bumpItem', () => {
        it('should mark item as READY and check full ticket readiness', async () => {
            // updateItem returns item with productId for event
            repo.updateItem.mockResolvedValue({ id: 'item-1', status: 'READY', productId: 'prod-1' });
            // findWithItems returns ticket with all items NOT ready
            repo.findWithItems.mockResolvedValue({
                id: 'ticket-1',
                items: [
                    { id: 'item-1', status: 'READY' },
                    { id: 'item-2', status: 'NEW' }, // Not all ready
                ],
            });

            await service.bumpItem('ticket-1', 'item-1');

            expect(repo.updateItem).toHaveBeenCalledWith('item-1', { status: 'READY' });
            expect(eventBus.publish).toHaveBeenCalledWith('ItemBumped', expect.anything());
        });

        it('should auto-mark ticket ready when all items are READY', async () => {
            repo.updateItem.mockResolvedValue({ id: 'item-1', status: 'READY', productId: 'prod-1' });
            repo.findWithItems.mockResolvedValue({
                id: 'ticket-1',
                items: [
                    { id: 'item-1', status: 'READY' },
                    { id: 'item-2', status: 'READY' }, // All ready!
                ],
            });
            repo.findById.mockResolvedValue({ id: 'ticket-1', status: 'PREPARING' });
            repo.update.mockResolvedValue({ id: 'ticket-1', status: 'READY' });

            await service.bumpItem('ticket-1', 'item-1');

            // Should trigger markTicketReady
            expect(repo.update).toHaveBeenCalled();
        });
    });

    // ==================== QUERY TESTS ====================

    describe('getActiveTickets', () => {
        it('should return active tickets for station', async () => {
            const tickets = [{ id: 'ticket-1', status: 'NEW' }, { id: 'ticket-2', status: 'PREPARING' }];
            repo.findActive.mockResolvedValue(tickets);

            const result = await service.getActiveTickets('station-1');
            expect(result).toHaveLength(2);
        });
    });

    describe('getTicketsByOrder', () => {
        it('should return tickets for order', async () => {
            const tickets = [{ id: 'ticket-1', orderId: 'order-1' }];
            repo.findByOrder.mockResolvedValue(tickets);

            const result = await service.getTicketsByOrder('order-1');
            expect(result).toHaveLength(1);
        });
    });

    describe('getTicketWithItems', () => {
        it('should return ticket with items', async () => {
            const ticket = { id: 'ticket-1', items: [{ id: 'item-1' }] };
            repo.findWithItems.mockResolvedValue(ticket);

            const result = await service.getTicketWithItems('ticket-1');
            expect(result.items).toHaveLength(1);
        });

        it('should throw NotFoundException', async () => {
            repo.findWithItems.mockResolvedValue(null);
            await expect(service.getTicketWithItems('non-existent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getAllStations', () => {
        it('should return all active stations', async () => {
            const stations = [{ id: 'station-grill', name: 'Grill' }, { id: 'station-fry', name: 'Fry' }];
            repo.findAllStations.mockResolvedValue(stations);

            const result = await service.getAllStations();
            expect(result).toHaveLength(2);
        });
    });

    describe('createStation', () => {
        it('should create kitchen station', async () => {
            const dto = { name: 'Salad Bar', nameAr: 'سلطات', color: '#4CAF50', displayOrder: 3 };
            const mockStation = { id: 'station-new', ...dto };
            repo.createStation.mockResolvedValue(mockStation);

            const result = await service.createStation(dto);

            expect(result.name).toBe('Salad Bar');
            expect(repo.createStation).toHaveBeenCalled();
        });
    });
});
