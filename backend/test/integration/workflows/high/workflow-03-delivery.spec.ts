/**
 * Workflow 3: Takeout/Delivery Order
 *
 * Source: WORKFLOWS.md - Delivery Workflows
 *
 * Tests:
 * - Calculate delivery fee
 * - Free delivery threshold
 * - Driver assignment
 * - Status tracking
 * - Delivery completion
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestAppException } from '../../../../src/common/exceptions';
import { DeliveryService } from '../../../../src/modules/delivery/delivery.service';
import { DeliveryRepository } from '../../../../src/modules/delivery/delivery.repository';

// Mock Repository
function createMockRepository() {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    findZoneByDistrict: jest.fn(),
    findActive: jest.fn(),
    findAllZones: jest.fn(),
    createZone: jest.fn(),
    findAllDrivers: jest.fn(),
    findAvailableDrivers: jest.fn(),
    findDriverById: jest.fn(),
    createDriver: jest.fn(),
    updateDriver: jest.fn(),
  };
}

function createMockEventBus() {
  return { publish: jest.fn(), subscribe: jest.fn() };
}

describe('Workflow 3: Takeout/Delivery Order', () => {
  let service: DeliveryService;
  let repo: ReturnType<typeof createMockRepository>;
  let eventBus: ReturnType<typeof createMockEventBus>;

  beforeEach(async () => {
    repo = createMockRepository();
    eventBus = createMockEventBus();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeliveryService,
        { provide: DeliveryRepository, useValue: repo },
        { provide: 'IEventBus', useValue: eventBus },
      ],
    }).compile();

    service = module.get<DeliveryService>(DeliveryService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==================== 3.1: DELIVERY FEE CALCULATION ====================
  describe('3.1: Delivery Fee Calculation', () => {
    it('should calculate delivery fee from zone', async () => {
      repo.findZoneByDistrict.mockResolvedValue({
        id: 'zone-1',
        deliveryFee: 15,
        estimatedTime: 30,
      });

      const result = await service.calculateFee('Olaya', 100);

      expect(result.fee).toBe(15);
      expect(result.estimate).toBe(30);
    });

    it('should apply free delivery for orders above threshold', async () => {
      repo.findZoneByDistrict.mockResolvedValue({
        id: 'zone-1',
        deliveryFee: 15,
        freeDeliveryThreshold: 100,
        estimatedTime: 30,
      });

      const result = await service.calculateFee('Olaya', 150);

      expect(result.fee).toBe(0);
    });

    it('should throw if zone not found', async () => {
      repo.findZoneByDistrict.mockResolvedValue(null);

      await expect(service.calculateFee('Unknown', 100)).rejects.toThrow(
        BadRequestAppException,
      );
    });
  });

  // ==================== 3.2: CREATE DELIVERY ====================
  describe('3.2: Create Delivery', () => {
    it('should create delivery with fee', async () => {
      repo.findZoneByDistrict.mockResolvedValue({
        id: 'zone-1',
        deliveryFee: 15,
        estimatedTime: 30,
      });
      repo.create.mockResolvedValue({
        id: 'del-1',
        orderId: 'order-1',
        deliveryFee: 15,
        status: 'PENDING',
      });

      const result = await service.createDelivery(
        { orderId: 'order-1', addressId: 'addr-1', orderTotal: 100 },
        'Olaya',
      );

      expect(result.status).toBe('PENDING');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'DeliveryCreated',
        expect.anything(),
      );
    });
  });

  // ==================== 3.3: DRIVER ASSIGNMENT ====================
  describe('3.3: Driver Assignment', () => {
    it('should assign available driver', async () => {
      repo.findDriverById.mockResolvedValue({
        id: 'driver-1',
        status: 'AVAILABLE',
      });
      repo.update.mockResolvedValue({
        id: 'del-1',
        driverId: 'driver-1',
        status: 'ASSIGNED',
      });
      repo.updateDriver.mockResolvedValue({});

      const result = await service.assignDriver('del-1', 'driver-1');

      expect(result.status).toBe('ASSIGNED');
      expect(result.driverId).toBe('driver-1');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'DriverAssigned',
        expect.anything(),
      );
    });

    it('should throw if driver not available', async () => {
      repo.findDriverById.mockResolvedValue({ id: 'driver-1', status: 'BUSY' });

      await expect(service.assignDriver('del-1', 'driver-1')).rejects.toThrow(
        BadRequestAppException,
      );
    });
  });

  // ==================== 3.4: STATUS UPDATES ====================
  describe('3.4: Status Updates', () => {
    it('should update status to PICKED_UP', async () => {
      repo.update.mockResolvedValue({ id: 'del-1', status: 'PICKED_UP' });

      const result = await service.updateStatus('del-1', 'PICKED_UP');

      expect(result.status).toBe('PICKED_UP');
      expect(eventBus.publish).toHaveBeenCalledWith(
        'DeliveryStatusUpdated',
        expect.anything(),
      );
    });

    it('should complete delivery and free driver', async () => {
      repo.findById.mockResolvedValue({ id: 'del-1', orderId: 'order-1' });
      repo.update.mockResolvedValue({ id: 'del-1', status: 'DELIVERED' });
      repo.updateDriver.mockResolvedValue({});

      await service.updateStatus('del-1', 'DELIVERED', 'driver-1');

      expect(repo.updateDriver).toHaveBeenCalledWith('driver-1', {
        status: 'AVAILABLE',
      });
      expect(eventBus.publish).toHaveBeenCalledWith(
        'DeliveryCompleted',
        expect.anything(),
      );
    });
  });

  // ==================== 3.5: ZONE MANAGEMENT ====================
  describe('3.5: Zone Management', () => {
    it('should create delivery zone', async () => {
      repo.createZone.mockResolvedValue({
        id: 'zone-1',
        name: 'Olaya District',
        deliveryFee: 15,
      });

      const result = await service.createZone({
        name: 'Olaya District',
        nameAr: 'حي العليا',
        deliveryFee: 15,
        estimatedTime: 30,
        districts: ['Olaya', 'Sulaimaniyah'],
      });

      expect(result.name).toBe('Olaya District');
    });

    it('should get all zones', async () => {
      repo.findAllZones.mockResolvedValue([
        { id: 'zone-1', name: 'Zone A' },
        { id: 'zone-2', name: 'Zone B' },
      ]);

      const result = await service.getAllZones();

      expect(result).toHaveLength(2);
    });
  });

  // ==================== 3.6: DRIVER MANAGEMENT ====================
  describe('3.6: Driver Management', () => {
    it('should get available drivers', async () => {
      repo.findAvailableDrivers.mockResolvedValue([
        { id: 'driver-1', status: 'AVAILABLE' },
      ]);

      const result = await service.getAvailableDrivers();

      expect(result).toHaveLength(1);
    });

    it('should update driver location', async () => {
      repo.updateDriver.mockResolvedValue({});

      await service.updateDriverLocation('driver-1', 24.7136, 46.6753);

      expect(repo.updateDriver).toHaveBeenCalledWith(
        'driver-1',
        expect.objectContaining({
          latitude: 24.7136,
          longitude: 46.6753,
        }),
      );
    });
  });
});
