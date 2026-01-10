// Discounts Controller
// Source: FINAL/BACKEND/13-MODULE-DISCOUNTS.md

import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import {
    CreateDiscountDto,
    UpdateDiscountDto,
    ValidateDiscountDto,
    ApplyDiscountDto,
} from './dto';

@Controller('discounts')
export class DiscountsController {
    constructor(private readonly service: DiscountsService) { }

    @Post()
    async create(@Body() dto: CreateDiscountDto) {
        return this.service.create(dto);
    }

    @Get()
    async getAll() {
        return this.service.getActiveDiscounts();
    }

    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.service.findById(id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
        return this.service.update(id, dto);
    }

    @Post('validate')
    async validate(@Body() dto: ValidateDiscountDto) {
        return this.service.validateAndCalculate(
            dto.code,
            dto.orderTotal,
            dto.customerId,
        );
    }

    @Post('apply')
    async apply(@Body() dto: ApplyDiscountDto) {
        return this.service.applyDiscount(dto);
    }

    @Get('valid')
    async getValidForOrder(
        @Query('orderTotal') orderTotal: number,
        @Query('customerId') customerId?: string,
    ) {
        return this.service.getValidDiscountsForOrder(orderTotal, customerId);
    }
}
