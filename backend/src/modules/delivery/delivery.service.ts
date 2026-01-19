// Delivery Service
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { DeliveryRepository } from './delivery.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import {
  CreateDeliveryDto,
  CreateDeliveryZoneDto,
  CreateDriverDto,
  UpdateDeliveryStatusDto,
} from './dto';
import {
  DeliveryCreatedEvent,
  DriverAssignedEvent,
  DeliveryStatusUpdatedEvent,
  DeliveryCompletedEvent,
} from './events/delivery.events';
import { Delivery, DeliveryZone, Driver } from './entities/delivery.entity';
import Decimal from 'decimal.js';

@Injectable()
export class DeliveryService {
  constructor(
    private readonly repo: DeliveryRepository,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) {}

  async calculateFee(
    addressDistrict: string,
    orderTotal: number,
  ): Promise<{ fee: number; zone: DeliveryZone | null; estimate: number }> {
    const zone = await this.repo.findZoneByDistrict(addressDistrict);
    if (!zone)
      throw new BadRequestException(
        `No delivery zone for district ${addressDistrict}`,
      );

    let fee = new Decimal(zone.deliveryFee);
    if (
      zone.freeDeliveryThreshold &&
      new Decimal(orderTotal).gte(zone.freeDeliveryThreshold)
    ) {
      fee = new Decimal(0);
    }
    return { fee: fee.toNumber(), zone, estimate: zone.estimatedTime };
  }

  async createDelivery(
    dto: CreateDeliveryDto,
    district: string,
  ): Promise<Delivery> {
    const { fee, zone } = await this.calculateFee(district, dto.orderTotal);
    const delivery = await this.repo.create({
      orderId: dto.orderId,
      addressId: dto.addressId,
      zoneId: zone?.id,
      deliveryFee: fee,
      scheduledFor: dto.scheduledFor,
      estimatedTime: zone?.estimatedTime,
      status: 'PENDING',
    });
    await this.eventBus.publish(
      'DeliveryCreated',
      new DeliveryCreatedEvent(delivery.id, dto.orderId),
    );
    return delivery;
  }

  async assignDriver(deliveryId: string, driverId: string): Promise<Delivery> {
    const driver = await this.repo.findDriverById(driverId);
    if (!driver || driver.status !== 'AVAILABLE')
      throw new BadRequestException('Driver not available');
    const delivery = await this.repo.update(deliveryId, {
      driverId,
      status: 'ASSIGNED',
    });
    await this.repo.updateDriver(driverId, { status: 'BUSY' });
    await this.eventBus.publish(
      'DriverAssigned',
      new DriverAssignedEvent(deliveryId, driverId),
    );
    return delivery;
  }

  async updateStatus(
    deliveryId: string,
    status: string,
    driverId?: string,
  ): Promise<Delivery> {
    const timestamps: any = {};
    if (status === 'PICKED_UP') timestamps.pickedUpAt = new Date();
    else if (status === 'DELIVERED') {
      timestamps.deliveredAt = new Date();
      if (driverId)
        await this.repo.updateDriver(driverId, { status: 'AVAILABLE' });
      const del = await this.repo.findById(deliveryId);
      if (del)
        await this.eventBus.publish(
          'DeliveryCompleted',
          new DeliveryCompletedEvent(deliveryId, del.orderId),
        );
    }
    const delivery = await this.repo.update(deliveryId, {
      status,
      ...timestamps,
    });
    await this.eventBus.publish(
      'DeliveryStatusUpdated',
      new DeliveryStatusUpdatedEvent(deliveryId, status),
    );
    return delivery;
  }

  async getActiveDeliveries(driverId?: string): Promise<Delivery[]> {
    return this.repo.findActive(driverId);
  }
  async getAllZones(): Promise<DeliveryZone[]> {
    return this.repo.findAllZones();
  }
  async createZone(dto: CreateDeliveryZoneDto): Promise<DeliveryZone> {
    return this.repo.createZone(dto);
  }
  async getAllDrivers(): Promise<Driver[]> {
    return this.repo.findAllDrivers();
  }
  async getAvailableDrivers(): Promise<Driver[]> {
    return this.repo.findAvailableDrivers();
  }
  async createDriver(dto: CreateDriverDto): Promise<Driver> {
    return this.repo.createDriver(dto);
  }
  async updateDriverLocation(
    driverId: string,
    lat: number,
    lng: number,
  ): Promise<void> {
    await this.repo.updateDriver(driverId, {
      latitude: lat,
      longitude: lng,
      lastLocationUpdate: new Date(),
    });
  }
}
