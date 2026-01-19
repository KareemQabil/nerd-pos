/**
 * Workflow 10: Kitchen Display System (KDS)
 *
 * Source: WORKFLOWS.md - Kitchen Operations
 * Note: Core kitchen logic already tested in W4 (workflow-04-kitchen)
 * This tests additional KDS-specific scenarios
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { KitchenService } from '../../../../src/modules/kitchen/kitchen.service';
import { KitchenRepository } from '../../../../src/modules/kitchen/kitchen.repository';
import { KitchenGateway } from '../../../../src/modules/kitchen/kitchen.gateway';

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

function createMockGateway() {
  return { emitToStation: jest.fn() };
}

describe('Workflow 10: Kitchen Display System', () => {
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

  afterEach(() => jest.clearAllMocks());

  // ==================== 10.1: DISPLAY FILTERING ====================
  describe('10.1: Display Filtering', () => {
    it('should get active tickets for specific station', async () => {
      repo.findActive.mockResolvedValue([
        { id: 'ticket-1', stationId: 'grill', status: 'NEW' },
        { id: 'ticket-2', stationId: 'grill', status: 'PREPARING' },
      ]);

      const result = await service.getActiveTickets('grill');

      expect(result).toHaveLength(2);
      expect(repo.findActive).toHaveBeenCalledWith('grill');
    });
  });

  // ==================== 10.2: TICKET DETAILS ====================
  describe('10.2: Ticket Details', () => {
    it('should get ticket with items for display', async () => {
      repo.findWithItems.mockResolvedValue({
        id: 'ticket-1',
        orderId: 'order-1',
        items: [
          { id: 'item-1', name: 'Burger', notes: 'No onions' },
          { id: 'item-2', name: 'Fries' },
        ],
      });

      const result = await service.getTicketWithItems('ticket-1');

      expect(result.items).toHaveLength(2);
    });

    it('should throw if ticket not found', async () => {
      repo.findWithItems.mockResolvedValue(null);

      await expect(service.getTicketWithItems('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ==================== 10.3: STATION MANAGEMENT ====================
  describe('10.3: Station Management', () => {
    it('should create new station', async () => {
      repo.createStation.mockResolvedValue({
        id: 'station-new',
        name: 'Drinks Station',
        color: '#2196F3',
      });

      const result = await service.createStation({
        name: 'Drinks Station',
        nameAr: 'محطة المشروبات',
        color: '#2196F3',
        displayOrder: 4,
      });

      expect(result.name).toBe('Drinks Station');
    });
  });

  // ==================== 10.4: ORDER TRACKING ====================
  describe('10.4: Order Tracking', () => {
    it('should get all tickets for order', async () => {
      repo.findByOrder.mockResolvedValue([
        { id: 'ticket-1', stationId: 'grill', status: 'COMPLETED' },
        { id: 'ticket-2', stationId: 'fry', status: 'PREPARING' },
      ]);

      const result = await service.getTicketsByOrder('order-1');

      expect(result).toHaveLength(2);
    });
  });
});
