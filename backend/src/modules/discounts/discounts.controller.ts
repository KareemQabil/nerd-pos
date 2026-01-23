// Discounts Controller
// Source: FINAL/BACKEND/13-MODULE-DISCOUNTS.md
// Security: Block 2 - All endpoints secured with @Permissions

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
  ValidateDiscountDto,
  ApplyDiscountDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly service: DiscountsService) { }

  @Permissions(PERMISSIONS.DISCOUNTS_CREATE) // Manager+
  @Post()
  async create(@Body() dto: CreateDiscountDto) {
    return this.service.create(dto);
  }

  @Permissions(PERMISSIONS.DISCOUNTS_VIEW) // Cashier+
  @Get()
  async getAll(@Query() pagination: PaginationDto) {
    const result = await this.service.getActiveDiscountsPaginated({
      page: pagination.page,
      limit: pagination.limit,
    });

    return new PaginatedResponseDto(
      result.data,
      result.total,
      result.page,
      result.limit,
    );
  }

  @Permissions(PERMISSIONS.DISCOUNTS_VIEW) // Cashier+
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Permissions(PERMISSIONS.DISCOUNTS_UPDATE) // Manager+
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.service.update(id, dto);
  }

  @Permissions(PERMISSIONS.DISCOUNTS_APPLY) // Cashier+
  @Post('validate')
  async validate(@Body() dto: ValidateDiscountDto) {
    return this.service.validateAndCalculate(
      dto.code,
      dto.orderTotal,
      dto.customerId,
    );
  }

  @Permissions(PERMISSIONS.DISCOUNTS_APPLY) // Cashier+
  @Post('apply')
  async apply(@Body() dto: ApplyDiscountDto) {
    return this.service.applyDiscount(dto);
  }

  @Permissions(PERMISSIONS.DISCOUNTS_VIEW) // Cashier+
  @Get('valid')
  async getValidForOrder(
    @Query('orderTotal') orderTotal: number,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.getValidDiscountsForOrder(orderTotal, customerId);
  }
}
