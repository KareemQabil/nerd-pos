// Tables Service
// Source: FINAL/BACKEND/12-MODULE-TABLES.md
// Handles: Floor management, table assignment, status, transfers, reservations

import {
  Injectable,
  Inject,
} from '@nestjs/common';
import { TablesRepository } from './tables.repository';
import { IEventBus } from '../../core/event-bus/event-bus.interface';
import { ErrorMessages } from '../../common/constants';
import {
  NotFoundAppException,
  BadRequestAppException,
} from '../../common/exceptions';
import {
  CreateFloorDto,
  UpdateFloorDto,
  CreateTableDto,
  UpdateTableDto,
  TransferTableDto,
  CreateReservationDto,
  UpdateReservationStatusDto,
} from './dto';
import {
  TableOccupiedEvent,
  TableReleasedEvent,
  TableTransferredEvent,
  ReservationCreatedEvent,
  ReservationStatusChangedEvent,
} from './events/tables.events';
import {
  Floor,
  FloorWithTables,
  Table,
  TableReservation,
} from './entities/tables.entity';

@Injectable()
export class TablesService {
  constructor(
    private readonly repo: TablesRepository,
    @Inject('IEventBus') private readonly eventBus: IEventBus,
  ) {}

  // ==================== FLOORS ====================

  async getAllFloors(): Promise<Floor[]> {
    return this.repo.findAllFloors();
  }

  async getFloorWithTables(floorId: string): Promise<FloorWithTables> {
    const floor = await this.repo.findFloorWithTables(floorId);
    if (!floor) {
      throw new NotFoundAppException(ErrorMessages.FloorNotFound, { floorId });
    }
    return floor;
  }

  async createFloor(dto: CreateFloorDto): Promise<Floor> {
    return this.repo.createFloor({
      ...dto,
      isActive: true,
    });
  }

  async updateFloor(id: string, dto: UpdateFloorDto): Promise<Floor> {
    return this.repo.updateFloor(id, dto);
  }

  // ==================== TABLES ====================

  async createTable(dto: CreateTableDto): Promise<Table> {
    return this.repo.create({
      ...dto,
      shape: dto.shape || 'SQUARE',
      status: 'AVAILABLE',
      isActive: true,
    });
  }

  async updateTable(id: string, dto: UpdateTableDto): Promise<Table> {
    return this.repo.update(id, dto);
  }

  async getTablesByFloor(floorId: string): Promise<Table[]> {
    return this.repo.findByFloor(floorId);
  }

  async getAvailableTables(floorId?: string): Promise<Table[]> {
    return this.repo.findAvailable(floorId);
  }

  async getOccupiedTables(floorId?: string): Promise<Table[]> {
    return this.repo.findOccupied(floorId);
  }

  // ==================== TABLE STATUS ====================

  async assignOrderToTable(tableId: string, orderId: string): Promise<Table> {
    const table = await this.repo.findById(tableId);
    if (!table) {
      throw new NotFoundAppException(ErrorMessages.TableNotFound, { tableId });
    }

    if (table.status !== 'AVAILABLE') {
      throw new BadRequestAppException(ErrorMessages.TableNotAvailable, {
        tableNumber: table.number,
        status: table.status,
      });
    }

    const updatedTable = await this.repo.update(tableId, {
      status: 'OCCUPIED',
      currentOrderId: orderId,
    });

    await this.eventBus.publish(
      'TableOccupied',
      new TableOccupiedEvent(tableId, orderId, table.number),
    );

    return updatedTable;
  }

  async releaseTable(tableId: string): Promise<Table> {
    const table = await this.repo.findById(tableId);
    if (!table) {
      throw new NotFoundAppException(ErrorMessages.TableNotFound, { tableId });
    }

    const updatedTable = await this.repo.update(tableId, {
      status: 'DIRTY',
      currentOrderId: null,
    });

    await this.eventBus.publish(
      'TableReleased',
      new TableReleasedEvent(tableId, table.number),
    );

    return updatedTable;
  }

  async markTableClean(tableId: string): Promise<Table> {
    return this.repo.update(tableId, {
      status: 'AVAILABLE',
    });
  }

  async transferTable(dto: TransferTableDto): Promise<void> {
    const fromTable = await this.repo.findById(dto.fromTableId);
    const toTable = await this.repo.findById(dto.toTableId);

    if (!fromTable || !toTable) {
      throw new NotFoundAppException(ErrorMessages.TableNotFound);
    }

    if (toTable.status !== 'AVAILABLE') {
      throw new BadRequestAppException(ErrorMessages.TableNotAvailable, {
        tableNumber: toTable.number,
        status: toTable.status,
      });
    }

    // Release source table
    await this.repo.update(dto.fromTableId, {
      status: 'AVAILABLE',
      currentOrderId: null,
    });

    // Assign to target table
    await this.repo.update(dto.toTableId, {
      status: 'OCCUPIED',
      currentOrderId: dto.orderId,
    });

    await this.eventBus.publish(
      'TableTransferred',
      new TableTransferredEvent(dto.fromTableId, dto.toTableId, dto.orderId),
    );
  }

  async assignWaiter(tableId: string, waiterId: string): Promise<Table> {
    return this.repo.update(tableId, { waiterId });
  }

  // ==================== RESERVATIONS ====================

  async createReservation(
    dto: CreateReservationDto,
  ): Promise<TableReservation> {
    // Check for conflicts
    const conflicts = await this.repo.findReservationConflicts(
      dto.tableId,
      dto.reservedFor,
      dto.duration || 120,
    );

    if (conflicts.length > 0) {
      throw new BadRequestAppException(ErrorMessages.ReservationConflict);
    }

    const reservation = await this.repo.createReservation({
      tableId: dto.tableId,
      customerId: dto.customerId,
      customerName: dto.customerName,
      customerPhone: dto.customerPhone,
      reservedFor: dto.reservedFor,
      partySize: dto.partySize,
      duration: dto.duration || 120,
      specialRequests: dto.specialRequests,
      status: 'PENDING',
      createdBy: dto.userId,
    });

    await this.eventBus.publish(
      'ReservationCreated',
      new ReservationCreatedEvent(reservation.id, dto.tableId, dto.reservedFor),
    );

    return reservation;
  }

  async updateReservationStatus(
    id: string,
    dto: UpdateReservationStatusDto,
  ): Promise<TableReservation> {
    const reservation = await this.repo.updateReservation(id, {
      status: dto.status,
    });

    await this.eventBus.publish(
      'ReservationStatusChanged',
      new ReservationStatusChangedEvent(id, dto.status),
    );

    // If seated, mark table as reserved
    if (dto.status === 'SEATED') {
      await this.repo.update(reservation.tableId, {
        status: 'OCCUPIED',
      });
    }

    return reservation;
  }

  async getTodayReservations(): Promise<TableReservation[]> {
    return this.repo.findTodayReservations();
  }

  async getReservationsByTable(
    tableId: string,
    date: Date,
  ): Promise<TableReservation[]> {
    return this.repo.findReservationsByTable(tableId, date);
  }
}
