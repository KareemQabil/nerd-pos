/**
 * Tables Service Unit Tests
 *
 * Tests for floor/table management including assignment, status, and transfers.
 * Uses repository pattern with event publishing.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TablesService } from './tables.service';
import { TablesRepository } from './tables.repository';

function createMockRepository() {
  return {
    // Floors
    findAllFloors: jest.fn(),
    findFloorWithTables: jest.fn(),
    createFloor: jest.fn(),
    updateFloor: jest.fn(),
    // Tables
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findByFloor: jest.fn(),
    findAvailable: jest.fn(),
    findOccupied: jest.fn(),
    // Reservations
    createReservation: jest.fn(),
    updateReservation: jest.fn(),
    findReservationConflicts: jest.fn(),
    findTodayReservations: jest.fn(),
    findReservationsByTable: jest.fn(),
  };
}

function createMockEventBus() {
  return { publish: jest.fn(), subscribe: jest.fn() };
}

const mockFloor = {
  id: 'floor-1',
  name: 'Ground Floor',
  nameAr: 'الطابق الأرضي',
  sortOrder: 1,
  isActive: true,
};
const mockTable = {
  id: 'table-1',
  number: 'T1',
  floorId: 'floor-1',
  capacity: 4,
  status: 'AVAILABLE',
  isActive: true,
};

describe('TablesService', () => {
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

  // ==================== FLOORS ====================
  describe('getAllFloors', () => {
    it('should return all floors', async () => {
      repo.findAllFloors.mockResolvedValue([
        mockFloor,
        { ...mockFloor, id: 'floor-2', name: 'Terrace' },
      ]);
      const result = await service.getAllFloors();
      expect(result).toHaveLength(2);
    });
  });

  describe('getFloorWithTables', () => {
    it('should return floor with tables', async () => {
      repo.findFloorWithTables.mockResolvedValue({
        ...mockFloor,
        tables: [mockTable],
      });
      const result = await service.getFloorWithTables('floor-1');
      expect(result.tables).toHaveLength(1);
    });

    it('should throw NotFoundException if floor not found', async () => {
      repo.findFloorWithTables.mockResolvedValue(null);
      await expect(service.getFloorWithTables('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createFloor', () => {
    it('should create floor with defaults', async () => {
      repo.createFloor.mockImplementation((data) =>
        Promise.resolve({ id: 'new', ...data }),
      );
      await service.createFloor({
        name: 'New Floor',
        nameAr: 'طابق جديد',
        displayOrder: 1,
      });
      expect(repo.createFloor).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: true }),
      );
    });
  });

  // ==================== TABLES ====================
  describe('createTable', () => {
    it('should create table with defaults', async () => {
      repo.create.mockImplementation((data) =>
        Promise.resolve({ id: 'new', ...data }),
      );
      await service.createTable({
        number: 'T5',
        floorId: 'floor-1',
        capacity: 4,
        section: 'INDOOR',
      });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          shape: 'SQUARE',
          status: 'AVAILABLE',
          isActive: true,
        }),
      );
    });
  });

  describe('getAvailableTables', () => {
    it('should return available tables', async () => {
      repo.findAvailable.mockResolvedValue([mockTable]);
      const result = await service.getAvailableTables('floor-1');
      expect(result).toHaveLength(1);
      expect(repo.findAvailable).toHaveBeenCalledWith('floor-1');
    });
  });

  // ==================== TABLE STATUS ====================
  describe('assignOrderToTable', () => {
    it('should assign order and publish TableOccupied event', async () => {
      repo.findById.mockResolvedValue(mockTable);
      repo.update.mockResolvedValue({
        ...mockTable,
        status: 'OCCUPIED',
        currentOrderId: 'order-1',
      });

      const result = await service.assignOrderToTable('table-1', 'order-1');

      expect(result.status).toBe('OCCUPIED');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'TableOccupied',
        expect.anything(),
      );
    });

    it('should throw NotFoundException if table not found', async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.assignOrderToTable('invalid', 'order-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if table not available', async () => {
      repo.findById.mockResolvedValue({ ...mockTable, status: 'OCCUPIED' });
      await expect(
        service.assignOrderToTable('table-1', 'order-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('releaseTable', () => {
    it('should release table and publish TableReleased event', async () => {
      repo.findById.mockResolvedValue({ ...mockTable, status: 'OCCUPIED' });
      repo.update.mockResolvedValue({
        ...mockTable,
        status: 'DIRTY',
        currentOrderId: null,
      });

      const result = await service.releaseTable('table-1');

      expect(result.status).toBe('DIRTY');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'TableReleased',
        expect.anything(),
      );
    });
  });

  describe('markTableClean', () => {
    it('should set table status to available', async () => {
      repo.update.mockResolvedValue({ ...mockTable, status: 'AVAILABLE' });
      const result = await service.markTableClean('table-1');
      expect(result.status).toBe('AVAILABLE');
    });
  });

  describe('transferTable', () => {
    it('should transfer order between tables and publish event', async () => {
      const fromTable = {
        ...mockTable,
        id: 'from',
        status: 'OCCUPIED',
        currentOrderId: 'order-1',
      };
      const toTable = {
        ...mockTable,
        id: 'to',
        number: 'T2',
        status: 'AVAILABLE',
      };

      repo.findById
        .mockResolvedValueOnce(fromTable)
        .mockResolvedValueOnce(toTable);
      repo.update.mockResolvedValue(toTable);

      await service.transferTable({
        fromTableId: 'from',
        toTableId: 'to',
        orderId: 'order-1',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        'TableTransferred',
        expect.anything(),
      );
      expect(repo.update).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException if target table not available', async () => {
      repo.findById
        .mockResolvedValueOnce(mockTable)
        .mockResolvedValueOnce({ ...mockTable, status: 'OCCUPIED' });
      await expect(
        service.transferTable({
          fromTableId: 'from',
          toTableId: 'to',
          orderId: 'order-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ==================== RESERVATIONS ====================
  describe('createReservation', () => {
    it('should create reservation and publish event', async () => {
      repo.findReservationConflicts.mockResolvedValue([]);
      repo.createReservation.mockResolvedValue({
        id: 'res-1',
        tableId: 'table-1',
        status: 'PENDING',
      });

      const result = await service.createReservation({
        tableId: 'table-1',
        customerName: 'Mohammed',
        customerPhone: '+966555123456',
        reservedFor: new Date(),
        partySize: 4,
        userId: 'user-1',
      });

      expect(result.status).toBe('PENDING');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'ReservationCreated',
        expect.anything(),
      );
    });

    it('should throw BadRequestException if time conflict', async () => {
      repo.findReservationConflicts.mockResolvedValue([{ id: 'existing' }]);

      await expect(
        service.createReservation({
          tableId: 'table-1',
          customerName: 'Mohammed',
          customerPhone: '+966555123456',
          reservedFor: new Date(),
          partySize: 4,
          userId: 'user-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateReservationStatus', () => {
    it('should update status and publish event', async () => {
      repo.updateReservation.mockResolvedValue({
        id: 'res-1',
        tableId: 'table-1',
        status: 'CONFIRMED',
      });
      repo.update.mockResolvedValue(mockTable);

      const result = await service.updateReservationStatus('res-1', {
        status: 'CONFIRMED',
      });

      expect(result.status).toBe('CONFIRMED');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'ReservationStatusChanged',
        expect.anything(),
      );
    });
  });
});
