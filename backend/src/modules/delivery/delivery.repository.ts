// Delivery Repository
import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../core/repository/base.repository';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Delivery, DeliveryZone, Driver } from './entities/delivery.entity';

@Injectable()
export class DeliveryRepository extends BaseRepository<Delivery, 'delivery'> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
  protected get model(): 'delivery' {
    return 'delivery';
  }

  async findByOrder(orderId: string): Promise<Delivery | null> {
    return this.prisma.delivery.findUnique({ where: { orderId } });
  }

  async findActive(driverId?: string): Promise<Delivery[]> {
    const where: any = {
      status: { in: ['PENDING', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'] },
    };
    if (driverId) where.driverId = driverId;
    return this.prisma.delivery.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  // Zones
  async findAllZones(): Promise<DeliveryZone[]> {
    return this.prisma.deliveryZone.findMany({
      where: { isActive: true },
    });
  }

  async findZoneByDistrict(district: string): Promise<DeliveryZone | null> {
    return this.prisma.deliveryZone.findFirst({
      where: { districts: { has: district }, isActive: true },
    });
  }

  async createZone(data: any): Promise<DeliveryZone> {
    return this.prisma.deliveryZone.create({
      data: { ...data, isActive: true },
    });
  }

  // Drivers
  async findAllDrivers(): Promise<Driver[]> {
    return this.prisma.driver.findMany({ where: { isActive: true } });
  }

  async findAvailableDrivers(): Promise<Driver[]> {
    return this.prisma.driver.findMany({
      where: { status: 'AVAILABLE', isActive: true },
    });
  }

  async findDriverById(id: string): Promise<Driver | null> {
    return this.prisma.driver.findUnique({ where: { id } });
  }

  async createDriver(data: any): Promise<Driver> {
    return this.prisma.driver.create({
      data: { ...data, status: 'OFFLINE', totalDeliveries: 0, isActive: true },
    });
  }

  async updateDriver(id: string, data: any): Promise<Driver> {
    return this.prisma.driver.update({ where: { id }, data });
  }
}
