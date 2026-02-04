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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto';
import {
  CreateDiscountDto,
  UpdateDiscountDto,
  ValidateDiscountDto,
  ApplyDiscountDto,
  DiscountResponseDto,
  DiscountValidationResponseDto,
  DiscountUsageResponseDto,
  DiscountPaginatedResponseDto,
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { ApiErrorResponse, ApiResultResponse } from '../../common/decorators';

@ApiTags('Discounts')
@ApiBearerAuth('JWT')
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly service: DiscountsService) { }

  @Post()
  @Permissions(PERMISSIONS.DISCOUNTS_CREATE) // Manager+
  @ApiOperation({ summary: 'Create discount', description: 'Creates a new discount rule. Manager+ required.' })
  @ApiResultResponse({
    status: 201,
    description: 'Discount created',
    type: DiscountResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Validation error or code already exists' })
  async create(@Body() dto: CreateDiscountDto) {
    return this.service.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.DISCOUNTS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get active discounts', description: 'Returns paginated active discounts' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResultResponse({
    status: 200,
    description: 'Discounts retrieved',
    type: DiscountPaginatedResponseDto,
  })
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

  @Get(':id')
  @Permissions(PERMISSIONS.DISCOUNTS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get discount by ID', description: 'Returns discount details' })
  @ApiParam({ name: 'id', description: 'Discount UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Discount found',
    type: DiscountResponseDto,
  })
  @ApiErrorResponse({ status: 404, description: 'Discount not found' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.DISCOUNTS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update discount', description: 'Updates discount rules. Manager+ required.' })
  @ApiParam({ name: 'id', description: 'Discount UUID' })
  @ApiResultResponse({ status: 200, description: 'Discount updated', type: DiscountResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Discount not found' })
  @ApiErrorResponse({ status: 400, description: 'Validation error' })
  async update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.service.update(id, dto);
  }

  @Post('validate')
  @Permissions(PERMISSIONS.DISCOUNTS_APPLY) // Cashier+
  @ApiOperation({ summary: 'Validate discount code', description: 'Validates discount code and calculates savings' })
  @ApiResultResponse({
    status: 200,
    description: 'Discount validated and calculated',
    type: DiscountValidationResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Invalid code, expired, or conditions not met' })
  async validate(@Body() dto: ValidateDiscountDto) {
    return this.service.validateAndCalculate(
      dto.code,
      dto.orderTotal,
      dto.customerId,
    );
  }

  @Post('apply')
  @Permissions(PERMISSIONS.DISCOUNTS_APPLY) // Cashier+
  @ApiOperation({ summary: 'Apply discount to order', description: 'Applies validated discount to order' })
  @ApiResultResponse({
    status: 200,
    description: 'Discount applied',
    type: DiscountUsageResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Discount cannot be applied' })
  async apply(@Body() dto: ApplyDiscountDto) {
    return this.service.applyDiscount(dto);
  }

  @Get('valid')
  @Permissions(PERMISSIONS.DISCOUNTS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get valid discounts for order', description: 'Returns discounts applicable to order total' })
  @ApiQuery({ name: 'orderTotal', required: true, description: 'Order total amount' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Customer UUID for tier-based discounts' })
  @ApiResultResponse({
    status: 200,
    description: 'Valid discounts retrieved',
    type: DiscountResponseDto,
    isArray: true,
  })
  async getValidForOrder(
    @Query('orderTotal') orderTotal: number,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.getValidDiscountsForOrder(orderTotal, customerId);
  }
}

