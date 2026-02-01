// Customers Controller
// Source: FINAL/BACKEND/09-MODULE-CUSTOMERS.md
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
import { CustomersService } from './customers.service';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
  AddAddressDto,
  RedeemPointsDto,
  CreateLoyaltyTierDto,
  UpdateLoyaltyTierDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@ApiTags('Customers')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  // ==================== CUSTOMER CRUD ====================

  @Post()
  @Permissions(PERMISSIONS.CUSTOMERS_CREATE) // Cashier+
  @ApiOperation({
    summary: 'Create customer',
    description: 'Creates a new customer record',
  })
  @ApiResponse({
    status: 201,
    description: 'Customer created successfully',
    schema: {
      example: {
        success: true,
        message: 'Customer created successfully',
        data: {
          id: 'cust_123456789',
          code: 'CUS20260100001',
          nameEn: 'Ahmed Mohamed',
          nameAr: 'أحمد محمد',
          phone: '+966501234567',
          email: 'ahmed@example.com',
          preferredLanguage: 'ar',
          notes: 'VIP customer',
          loyaltyPoints: 0,
          tier: 'BRONZE',
        },
        timestamp: '2026-01-23T12:00:00Z',
        path: '/api/v1/customers',
        requestId: 'req_123',
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Validation error or phone number already exists',
  })
  async create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  @Get('search')
  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Search customers',
    description: 'Searches customers by name, phone, or email with pagination',
  })
  @ApiQuery({ name: 'q', required: false, description: 'Search query string' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated customer results',
    type: PaginatedResponseDto,
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          {
            id: 'cust_123',
            nameEn: 'Ahmed Mohamed',
            nameAr: 'أحمد محمد',
            phone: '+966501234567',
            tier: 'GOLD',
          },
        ],
        meta: {
          total: 50,
          page: 1,
          limit: 10,
        },
        timestamp: '2026-01-23T12:00:00Z',
        path: '/api/v1/customers/search',
      },
    },
  })
  async search(@Query('q') query: string, @Query() pagination: PaginationDto) {
    const result = await this.service.searchPaginated(query || '', {
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

  @Get('phone/:phone')
  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Find customer by phone',
    description: 'Looks up customer by phone number',
  })
  @ApiParam({ name: 'phone', description: 'Phone number' })
  @ApiResponse({
    status: 200,
    description: 'Customer found',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'cust_123',
          nameEn: 'Ahmed Mohamed',
          nameAr: 'أحمد محمد',
          phone: '+966501234567',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async findByPhone(@Param('phone') phone: string) {
    return this.service.findByPhone(phone);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get customer by ID',
    description: 'Returns customer details by UUID',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/details')
  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get customer with tier',
    description: 'Returns customer with loyalty tier information',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({
    status: 200,
    description: 'Customer with tier details',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: {
          id: 'cust_123',
          nameEn: 'Ahmed Mohamed',
          nameAr: 'أحمد محمد',
          tier: 'GOLD',
          tierProgress: 75,
          nextTier: 'PLATINUM',
          pointsToNextTier: 250,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async findWithTier(@Param('id') id: string) {
    return this.service.findWithTier(id);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.CUSTOMERS_UPDATE) // Cashier+
  @ApiOperation({
    summary: 'Update customer',
    description: 'Updates customer information',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer updated' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(id, dto);
  }

  // ==================== ADDRESSES ====================

  @Post(':id/addresses')
  @Permissions(PERMISSIONS.CUSTOMERS_UPDATE) // Cashier+
  @ApiOperation({
    summary: 'Add customer address',
    description: 'Adds a delivery address for customer',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({
    status: 201,
    description: 'Address added',
    schema: {
      example: {
        success: true,
        message: 'Address added successfully',
        data: {
          id: 'addr_123',
          customerId: 'cust_123',
          type: 'HOME',
          street: 'King Fahd Road',
          city: 'Riyadh',
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async addAddress(@Param('id') id: string, @Body() dto: AddAddressDto) {
    return this.service.addAddress({ ...dto, customerId: id });
  }

  @Get(':id/addresses')
  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get customer addresses',
    description: 'Returns all addresses for customer',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async getAddresses(@Param('id') id: string) {
    return this.service.getAddresses(id);
  }

  // ==================== LOYALTY ====================

  @Post(':id/loyalty/redeem')
  @Permissions(PERMISSIONS.CUSTOMERS_LOYALTY_ADJUST) // 🔒 Manager only
  @ApiOperation({
    summary: 'Redeem loyalty points',
    description: 'Redeems customer loyalty points. Manager only.',
  })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({
    status: 200,
    description: 'Points redeemed',
    schema: {
      example: {
        success: true,
        message: 'Points redeemed successfully',
        data: {
          remainingPoints: 150,
          redeemedPoints: 100,
          redeemedValue: 10.0,
        },
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiBadRequestResponse({ description: 'Insufficient points' })
  async redeemPoints(@Param('id') id: string, @Body() dto: RedeemPointsDto) {
    return this.service.redeemPoints(id, dto.points);
  }

  // ==================== TIERS ====================

  @Get('tiers')
  @Permissions(PERMISSIONS.CUSTOMERS_LOYALTY_VIEW) // Cashier+
  @ApiOperation({
    summary: 'Get all loyalty tiers',
    description: 'Returns all loyalty tier configurations',
  })
  @ApiResponse({
    status: 200,
    description: 'Loyalty tiers retrieved',
    schema: {
      example: {
        success: true,
        message: 'Request successful',
        data: [
          { name: 'BRONZE', minPoints: 0, multiplier: 1.0 },
          { name: 'SILVER', minPoints: 1000, multiplier: 1.2 },
          { name: 'GOLD', minPoints: 5000, multiplier: 1.5 },
        ],
        timestamp: '2026-01-23T12:00:00Z',
      },
    },
  })
  async getAllTiers() {
    return this.service.getAllTiers();
  }

  @Post('tiers')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({
    summary: 'Create loyalty tier',
    description: 'Creates a new loyalty tier. Admin only.',
  })
  @ApiResponse({ status: 201, description: 'Tier created' })
  @ApiBadRequestResponse({
    description: 'Validation error or duplicate tier name',
  })
  async createTier(@Body() dto: CreateLoyaltyTierDto) {
    return this.service.createTier(dto);
  }

  @Put('tiers/:id')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({
    summary: 'Update loyalty tier',
    description: 'Updates loyalty tier. Admin only.',
  })
  @ApiParam({ name: 'id', description: 'Tier UUID' })
  @ApiResponse({ status: 200, description: 'Tier updated' })
  @ApiNotFoundResponse({ description: 'Tier not found' })
  async updateTier(@Param('id') id: string, @Body() dto: UpdateLoyaltyTierDto) {
    return this.service.updateTier(id, dto);
  }
}
