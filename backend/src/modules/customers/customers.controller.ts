// Customers Controller
// Source: FINAL/BACKEND/09-MODULE-CUSTOMERS.md

import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import {
    CreateCustomerDto,
    UpdateCustomerDto,
    AddAddressDto,
    RedeemPointsDto,
    CreateLoyaltyTierDto,
    UpdateLoyaltyTierDto,
} from './dto';

@Controller('customers')
export class CustomersController {
    constructor(private readonly service: CustomersService) { }

    // ==================== CUSTOMER CRUD ====================

    @Post()
    async create(@Body() dto: CreateCustomerDto) {
        return this.service.create(dto);
    }

    @Get('search')
    async search(@Query('q') query: string) {
        return this.service.search(query);
    }

    @Get('phone/:phone')
    async findByPhone(@Param('phone') phone: string) {
        return this.service.findByPhone(phone);
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.service.findById(id);
    }

    @Get(':id/details')
    async findWithTier(@Param('id') id: string) {
        return this.service.findWithTier(id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
        return this.service.update(id, dto);
    }

    // ==================== ADDRESSES ====================

    @Post(':id/addresses')
    async addAddress(@Param('id') id: string, @Body() dto: AddAddressDto) {
        return this.service.addAddress({ ...dto, customerId: id });
    }

    @Get(':id/addresses')
    async getAddresses(@Param('id') id: string) {
        return this.service.getAddresses(id);
    }

    // ==================== LOYALTY ====================

    @Post(':id/loyalty/redeem')
    async redeemPoints(@Param('id') id: string, @Body() dto: RedeemPointsDto) {
        return this.service.redeemPoints(id, dto.points);
    }

    // ==================== TIERS ====================

    @Get('tiers')
    async getAllTiers() {
        return this.service.getAllTiers();
    }

    @Post('tiers')
    async createTier(@Body() dto: CreateLoyaltyTierDto) {
        return this.service.createTier(dto);
    }

    @Put('tiers/:id')
    async updateTier(@Param('id') id: string, @Body() dto: UpdateLoyaltyTierDto) {
        return this.service.updateTier(id, dto);
    }
}
