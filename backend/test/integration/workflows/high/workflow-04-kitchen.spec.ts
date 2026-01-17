/**
 * Workflow 4: Kitchen Preparation
 * 
 * Source: WORKFLOWS.md - Kitchen Workflows
 * Pattern: Copied from existing kitchen.service.spec.ts (Phase 2)
 * 
 * Tests the KDS workflow:
 * - Ticket creation and routing
 * - Start preparation
 * - Bump items
 * - Complete ticket
 * - Priority handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { KitchenService } from '../../../../src/modules/kitchen/kitchen.service';
import { KitchenRepository } from '../../../../src/modules/kitchen/kitchen.repository';
import { KitchenGateway } from '../../../../src/modules/kitchen/kitchen.gateway';

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
        emitToStation: jest.fn(),
    };
}

describe('Workflow 4: Kitchen Preparation', () => {
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

    // ==================== 4.1: PRIORITY ROUTING ====================
    describe('4.1: Priority Routing', () => {
        it('should prioritize DINE_IN orders highest (100)', () => {
            const calculatePriority = (service as any).calculatePriority.bind(service);
            expect(calculatePriority('DINE_IN')).toBe(100);
        });

        it('should prioritize DELIVERY orders second (80)', () => {
            const calculatePriority = (service as any).calculatePriority.bind(service);
            expect(calculatePriority('DELIVERY')).toBe(80);
        });

        it('should give default priority to other types (50)', () => {
            const calculatePriority = (service as any).calculatePriority.bind(service);
            expect(calculatePriority('TAKEAWAY')).toBe(50);
        });
    });

    // ==================== 4.2: TICKET LIFECYCLE ====================
    describe('4.2: Ticket Lifecycle', () => {
        it('should start preparation (NEW → PREPARING)', async () => {
            const ticket = { id: 'ticket-1', status: 'NEW', stationId: 'station-1', orderId: 'order-1' };
            repo.findById.mockResolvedValue(ticket);
            repo.update.mockResolvedValue({ ...ticket, status: 'PREPARING' });

            const result = await service.startPreparation('ticket-1');

            expect(result.status).toBe('PREPARING');
            expect(eventBus.publish).toHaveBeenCalledWith('TicketStarted', expect.anything());
        });

        it('should mark ticket ready (PREPARING → READY)', async () => {
            const ticket = { id: 'ticket-1', status: 'PREPARING' };
            repo.findById.mockResolvedValue(ticket);
            repo.update.mockResolvedValue({ ...ticket, status: 'READY' });

            const result = await service.markTicketReady('ticket-1');

            expect(result.status).toBe('READY');
        });

        it('should complete ticket (READY → COMPLETED)', async () => {
            const ticket = { id: 'ticket-1', status: 'READY', orderId: 'order-1', stationId: 'station-1' };
            repo.findById.mockResolvedValue(ticket);
            repo.update.mockResolvedValue({ ...ticket, status: 'COMPLETED' });
            repo.findByOrder.mockResolvedValue([{ ...ticket, status: 'COMPLETED' }]);

            const result = await service.completeTicket('ticket-1');

            expect(result.status).toBe('COMPLETED');
            expect(eventBus.publish).toHaveBeenCalledWith('TicketCompleted', expect.anything());
        });
    });

    // ==================== 4.3: BUMP BAR OPERATION ====================
    describe('4.3: Bump Bar Operation', () => {
        it('should mark individual item as READY', async () => {
            repo.updateItem.mockResolvedValue({ id: 'item-1', status: 'READY', productId: 'prod-1' });
            repo.findWithItems.mockResolvedValue({
                id: 'ticket-1',
                items: [
                    { id: 'item-1', status: 'READY' },
                    { id: 'item-2', status: 'NEW' },
                ],
            });

            await service.bumpItem('ticket-1', 'item-1');

            expect(repo.updateItem).toHaveBeenCalledWith('item-1', { status: 'READY' });
            expect(eventBus.publish).toHaveBeenCalledWith('ItemBumped', expect.anything());
        });

        it('should auto-mark ticket ready when all items bumped', async () => {
            repo.updateItem.mockResolvedValue({ id: 'item-2', status: 'READY', productId: 'prod-2' });
            repo.findWithItems.mockResolvedValue({
                id: 'ticket-1',
                items: [
                    { id: 'item-1', status: 'READY' },
                    { id: 'item-2', status: 'READY' },
                ],
            });
            repo.findById.mockResolvedValue({ id: 'ticket-1', status: 'PREPARING' });
            repo.update.mockResolvedValue({ id: 'ticket-1', status: 'READY' });

            await service.bumpItem('ticket-1', 'item-2');

            expect(repo.update).toHaveBeenCalled();
        });
    });

    // ==================== 4.4: WEBSOCKET COMMUNICATION ====================
    describe('4.4: WebSocket Communication', () => {
        it('should emit to station when ticket started', async () => {
            const ticket = { id: 'ticket-1', status: 'NEW', stationId: 'station-grill', orderId: 'order-1' };
            repo.findById.mockResolvedValue(ticket);
            repo.update.mockResolvedValue({ ...ticket, status: 'PREPARING' });

            await service.startPreparation('ticket-1');

            expect(gateway.emitToStation).toHaveBeenCalledWith(
                'station-grill',
                'ticketStarted',
                expect.anything(),
            );
        });
    });

    // ==================== 4.5: STATION QUERIES ====================
    describe('4.5: Station Queries', () => {
        it('should get active tickets for station', async () => {
            repo.findActive.mockResolvedValue([
                { id: 'ticket-1', status: 'NEW' },
                { id: 'ticket-2', status: 'PREPARING' },
            ]);

            const result = await service.getActiveTickets('station-grill');

            expect(result).toHaveLength(2);
        });

        it('should get all stations', async () => {
            repo.findAllStations.mockResolvedValue([
                { id: 'station-grill', name: 'Grill' },
                { id: 'station-fry', name: 'Fryer' },
            ]);

            const result = await service.getAllStations();

            expect(result).toHaveLength(2);
        });
    });

    // ==================== 4.6: ORDER COMPLETION ====================
    describe('4.6: Order Completion', () => {
        it('should publish OrderPrepared when all tickets complete', async () => {
            const ticket = { id: 'ticket-1', status: 'READY', orderId: 'order-1', stationId: 'station-1' };
            repo.findById.mockResolvedValue(ticket);
            repo.update.mockResolvedValue({ ...ticket, status: 'COMPLETED' });
            repo.findByOrder.mockResolvedValue([
                { id: 'ticket-1', status: 'COMPLETED' },
            ]);

            await service.completeTicket('ticket-1');

            expect(eventBus.publish).toHaveBeenCalledWith('OrderPrepared', expect.anything());
        });
    });
});
