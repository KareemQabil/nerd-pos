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
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
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

@ApiTags('Discounts')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('discounts')
export class DiscountsController {
  constructor(private readonly service: DiscountsService) {}

  @Post()
  @Permissions(PERMISSIONS.DISCOUNTS_CREATE) // Manager+
  @ApiOperation({
    summary: 'Create discount',
    description: 'Creates a new discount rule. Manager+ required.',
  })
  @ApiResponse({
    status: 201,
    description: 'Discount created',
    schema: {
      example: {
        success: true,
        message: 'Discount created successfully',
        data: {
          id: 'disc_123',
          code: 'SUMMER2026',
          type: 'PERCENTAGE',
          value: 10.0,
          status: 'ACTIVE',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or code already exists',
  })
  async create(@Body() dto: CreateDiscountDto) {
    return this.service.create(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.DISCOUNTS_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get active discounts',
    description: 'Returns paginated active discounts',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({
    status: 200,
    description: 'Discounts retrieved',
    type: PaginatedResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'disc_123',
            code: 'SUMMER2026',
            description: 'Summer Sale 10% Off',
            value: 10.0,
            type: 'PERCENTAGE',
          },
        ],
        meta: {
          total: 5,
          page: 1,
          limit: 10,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
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
  @ApiOperation({
    summary: 'Get discount by ID',
    description: 'Returns discount details',
  })
  @ApiParam({ name: 'id', description: 'Discount UUID' })
  @ApiResponse({
    status: 200,
    description: 'Discount found',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'disc_123',
          code: 'SUMMER2026',
          startDate: '2026-06-01',
          endDate: '2026-08-31',
          usageLimit: 1000,
          usageCount: 45,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Discount not found' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.DISCOUNTS_UPDATE) // Manager+
  @ApiOperation({
    summary: 'Update discount',
    description: 'Updates discount rules. Manager+ required.',
  })
  @ApiParam({ name: 'id', description: 'Discount UUID' })
  @ApiResponse({ status: 200, description: 'Discount updated' })
  @ApiNotFoundResponse({ description: 'Discount not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.service.update(id, dto);
  }

  @Post('validate')
  @Permissions(PERMISSIONS.DISCOUNTS_APPLY) // Cashier+
  @ApiOperation({
    summary: 'Validate discount code',
    description: 'Validates discount code and calculates savings',
  })
  @ApiResponse({
    status: 200,
    description: 'Discount validated and calculated',
    schema: {
      example: {
        success: true,
        message: 'Discount valid',
        data: {
          code: 'SUMMER2026',
          isValid: true,
          discountAmount: 15.5,
          finalTotal: 139.5,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid code, expired, or conditions not met',
  })
  async validate(@Body() dto: ValidateDiscountDto) {
    return this.service.validateAndCalculate(
      dto.code,
      dto.orderTotal,
      dto.customerId,
    );
  }

  @Post('apply')
  @Permissions(PERMISSIONS.DISCOUNTS_APPLY) // Cashier+
  @ApiOperation({
    summary: 'Apply discount to order',
    description: 'Applies validated discount to order',
  })
  @ApiResponse({
    status: 200,
    description: 'Discount applied',
    schema: {
      example: {
        success: true,
        message: 'Discount applied successfully',
        data: {
          orderId: 'ord_123',
          discountId: 'disc_123',
          appliedAmount: 15.5,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Discount cannot be applied' })
  async apply(@Body() dto: ApplyDiscountDto) {
    return this.service.applyDiscount(dto);
  }

  @Get('valid')
  @Permissions(PERMISSIONS.DISCOUNTS_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get valid discounts for order',
    description: 'Returns discounts applicable to order total',
  })
  @ApiQuery({
    name: 'orderTotal',
    required: true,
    description: 'Order total amount',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Customer UUID for tier-based discounts',
  })
  @ApiResponse({
    status: 200,
    description: 'Valid discounts retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            code: 'BULK10',
            description: '10% off orders over 500 SAR',
            minOrderAmount: 500,
          },
        ],
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getValidForOrder(
    @Query('orderTotal') orderTotal: number,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.getValidDiscountsForOrder(orderTotal, customerId);
  }
}
