# Kitchen Module Implementation

**Module**: Kitchen Display System (KDS)  
**Priority**: High (Operations)  
**Dependencies**: Sales, Products

---

## **OVERVIEW**

Kitchen Display System manages:
- **Ticket Routing** - Orders to prep stations
- **Preparation Status** - New → Preparing → Ready
- **Bump Bar** - Mark items complete
- **Station Management** - Grill, Fry, Salad, Drinks

---

## **ENTITIES**

```prisma
model KitchenTicket {
  id            String   @id @default(uuid())
  ticketNumber  String   @unique
  
  // Order reference
  orderId       String
  order         Order    @relation(fields: [orderId], references: [id])
  
  // Station
  stationId     String
  station       KitchenStation @relation(fields: [stationId], references: [id])
  
  // Timing
  receivedAt    DateTime @default(now())
  startedAt     DateTime?
  completedAt   DateTime?
  
  // Priority
  priority      Int      @default(0) // Higher = more urgent
  
  status        String   @default("NEW") // NEW, PREPARING, READY, COMPLETED
  
  // Related
  items         KitchenTicketItem[]
  
  @@index([orderId])
  @@index([stationId, status])
}

model KitchenTicketItem {
  id            String   @id @default(uuid())
  ticketId      String
  ticket        KitchenTicket @relation(fields: [ticketId], references: [id])
  
  // Product
  productId     String
  product       Product  @relation(fields: [productId], references: [id])
  
  quantity      Int
  notes         String?
  
  // Modifiers
  modifiers     Json?    // { "No Onions", "Extra Cheese" }
  
  status        String   @default("NEW")
  
  @@index([ticketId])
  @@index([status])
}

model KitchenStation {
  id            String   @id @default(uuid())
  name          String   // "Grill", "Fry", "Salad", "Drinks"
  nameAr        String
  
  // Display
  color         String   // For UI grouping
  displayOrder  Int
  
  // Categories routed to this station
  categories    Category[]
  
  // Related
  tickets       KitchenTicket[]
  
  isActive      Boolean  @default(true)
  
  @@index([displayOrder])
}
```

---

## **SERVICE**

```typescript
// kitchen.service.ts
@Injectable()
export class KitchenService {
  constructor(
    private readonly kitchenRepo: KitchenTicketRepository,
    private readonly orderRepo: OrderRepository,
    private readonly stationRepo: KitchenStationRepository,
    private readonly eventBus: IEventBus,
    private readonly websocketGateway: WebSocketGateway
  ) {}

  async routeOrder(orderId: string): Promise<void> {
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Group items by kitchen station
    const itemsByStation = await this.groupItemsByStation(order.items);

    // Create ticket for each station
    for (const [stationId, items] of itemsByStation.entries()) {
      const ticketNumber = await this.generateTicketNumber();

      const ticket = await this.kitchenRepo.create({
        ticketNumber,
        orderId,
        stationId,
        priority: this.calculatePriority(order),
        status: 'NEW'
      });

      // Add items to ticket
      for (const item of items) {
        await this.kitchenRepo.addItem(ticket.id, {
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
          modifiers: item.modifiers,
          status: 'NEW'
        });
      }

      // Emit to KDS screens
      await this.websocketGateway.emitToStation(stationId, 'newTicket', ticket);

      await this.eventBus.publish('TicketCreated',
        new TicketCreatedEvent(ticket.id, stationId, order.id)
      );
    }
  }

  private async groupItemsByStation(
    items: OrderItem[]
  ): Promise<Map<string, OrderItem[]>> {
    const grouped = new Map<string, OrderItem[]>();

    for (const item of items) {
      const product = await this.productRepo.findById(item.productId);
      const category = product.category;
      const station = await this.stationRepo.findByCategory(category.id);

      if (!station) {
        throw new Error(`No station found for category ${category.name}`);
      }

      if (!grouped.has(station.id)) {
        grouped.set(station.id, []);
      }
      grouped.get(station.id)!.push(item);
    }

    return grouped;
  }

  private calculatePriority(order: Order): number {
    // Dine-in orders are higher priority
    if (order.type === 'DINE_IN') {
      return 100;
    }
    // Delivery with target time
    if (order.deliveryTargetTime) {
      const minutesUntil = differenceInMinutes(
        order.deliveryTargetTime,
        new Date()
      );
      // More urgent as time gets closer
      return Math.max(0, 100 - minutesUntil);
    }
    return 50; // Default priority
  }

  async startPreparation(ticketId: string): Promise<KitchenTicket> {
    const ticket = await this.kitchenRepo.findById(ticketId);
    if (!ticket) {
      throw new NotFoundException(`Ticket ${ticketId} not found`);
    }

    const updatedTicket = await this.kitchenRepo.update(ticketId, {
      status: 'PREPARING',
      startedAt: new Date()
    });

    await this.websocketGateway.emitToStation(
      ticket.stationId,
      'ticketStarted',
      updatedTicket
    );

    await this.eventBus.publish('TicketStarted',
      new TicketStartedEvent(ticketId, ticket.orderId)
    );

    return updatedTicket;
  }

  async bumpItem(ticketId: string, itemId: string): Promise<void> {
    await this.kitchenRepo.updateItem(itemId, {
      status: 'COMPLETED'
    });

    // Check if all items completed
    const ticket = await this.kitchenRepo.findById(ticketId);
    const allCompleted = ticket.items.every(item => item.status === 'COMPLETED');

    if (allCompleted) {
      await this.completeTicket(ticketId);
    }
  }

  async completeTicket(ticketId: string): Promise<KitchenTicket> {
    const ticket = await this.kitchenRepo.findById(ticketId);
    
    const updatedTicket = await this.kitchenRepo.update(ticketId, {
      status: 'COMPLETED',
      completedAt: new Date()
    });

    await this.websocketGateway.emitToStation(
      ticket.stationId,
      'ticketCompleted',
      updatedTicket
    );

    await this.eventBus.publish('TicketCompleted',
      new TicketCompletedEvent(ticketId, ticket.orderId)
    );

    // Check if all order tickets completed
    await this.checkOrderCompletion(ticket.orderId);

    return updatedTicket;
  }

  private async checkOrderCompletion(orderId: string): Promise<void> {
    const tickets = await this.kitchenRepo.findByOrder(orderId);
    const allCompleted = tickets.every(t => t.status === 'COMPLETED');

    if (allCompleted) {
      await this.eventBus.publish('OrderPrepared',
        new OrderPreparedEvent(orderId)
      );
    }
  }

  async getActiveTickets(stationId: string): Promise<KitchenTicket[]> {
    return this.kitchenRepo.findActive(stationId);
  }

  private async generateTicketNumber(): Promise<string> {
    const date = new Date();
    const prefix = `KT${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const count = await this.kitchenRepo.countByPrefix(prefix);
    return `${prefix}${(count + 1).toString().padStart(4, '0')}`;
  }
}
```

---

## **CONTROLLER**

```typescript
// kitchen.controller.ts
@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('stations/:stationId/tickets')
  async getActiveTickets(@Param('stationId') stationId: string) {
    return this.kitchenService.getActiveTickets(stationId);
  }

  @Post('tickets/:id/start')
  async startPreparation(@Param('id') id: string) {
    return this.kitchenService.startPreparation(id);
  }

  @Post('tickets/:ticketId/items/:itemId/bump')
  async bumpItem(
    @Param('ticketId') ticketId: string,
    @Param('itemId') itemId: string
  ) {
    return this.kitchenService.bumpItem(ticketId, itemId);
  }

  @Post('tickets/:id/complete')
  async completeTicket(@Param('id') id: string) {
    return this.kitchenService.completeTicket(id);
  }
}
```

---

## **WEBSOCKET GATEWAY**

```typescript
// kitchen.gateway.ts
@WebSocketGateway({ namespace: '/kitchen' })
export class KitchenGateway {
  @WebSocketServer()
  server: Server;

  emitToStation(stationId: string, event: string, data: any) {
    this.server.to(`station:${stationId}`).emit(event, data);
  }

  @SubscribeMessage('joinStation')
  handleJoinStation(
    @MessageBody() stationId: string,
    @ConnectedSocket() client: Socket
  ) {
    client.join(`station:${stationId}`);
  }
}
```

---

## **KEY FEATURES**

1. **Auto-Routing** - Items to correct station by category
2. **Priority Queue** - Dine-in > urgent > regular
3. **Real-time Updates** - WebSocket to KDS screens
4. **Bump Bar** - Mark items complete individually
5. **Multi-Station** - One order → multiple stations
6. **Order Completion** - Event when all tickets done

---

## **NEXT**

- [09-MODULE-CUSTOMERS.md](09-MODULE-CUSTOMERS.md) - Customer management
