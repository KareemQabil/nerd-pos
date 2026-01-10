// Kitchen Controller
// Source: FINAL/BACKEND/08-MODULE-KITCHEN.md

import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
} from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { CreateKitchenStationDto, UpdateKitchenStationDto } from './dto';

@Controller('kitchen')
export class KitchenController {
    constructor(private readonly service: KitchenService) { }

    // ==================== TICKETS ====================

    @Get('stations/:stationId/tickets')
    async getActiveTickets(@Param('stationId') stationId: string) {
        return this.service.getActiveTickets(stationId);
    }

    @Get('tickets/:id')
    async getTicket(@Param('id') id: string) {
        return this.service.getTicketWithItems(id);
    }

    @Get('orders/:orderId/tickets')
    async getTicketsByOrder(@Param('orderId') orderId: string) {
        return this.service.getTicketsByOrder(orderId);
    }

    @Post('tickets/:id/start')
    async startPreparation(@Param('id') id: string) {
        return this.service.startPreparation(id);
    }

    @Post('tickets/:id/ready')
    async markReady(@Param('id') id: string) {
        return this.service.markTicketReady(id);
    }

    @Post('tickets/:id/complete')
    async completeTicket(@Param('id') id: string) {
        return this.service.completeTicket(id);
    }

    @Post('tickets/:ticketId/items/:itemId/bump')
    async bumpItem(
        @Param('ticketId') ticketId: string,
        @Param('itemId') itemId: string,
    ) {
        return this.service.bumpItem(ticketId, itemId);
    }

    // ==================== STATIONS ====================

    @Get('stations')
    async getAllStations() {
        return this.service.getAllStations();
    }

    @Post('stations')
    async createStation(@Body() dto: CreateKitchenStationDto) {
        return this.service.createStation(dto);
    }

    @Put('stations/:id')
    async updateStation(
        @Param('id') id: string,
        @Body() dto: UpdateKitchenStationDto,
    ) {
        return this.service.updateStation(id, dto);
    }
}
