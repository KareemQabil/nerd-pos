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
  constructor(private readonly service: CustomersService) { }

  // ==================== CUSTOMER CRUD ====================

  @Post()
  @Permissions(PERMISSIONS.CUSTOMERS_CREATE) // Cashier+
  @ApiOperation({ summary: 'Create customer', description: 'Creates a new customer record' })
  @ApiResponse({ status: 201, description: 'Customer created successfully' })
  @ApiBadRequestResponse({ description: 'Validation error or phone number already exists' })
  async create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  @Get('search')
  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Search customers', description: 'Searches customers by name, phone, or email with pagination' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query string' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated customer results', type: PaginatedResponseDto })
  async search(
    @Query('q') query: string,
    @Query() pagination: PaginationDto,
  ) {
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
  @ApiOperation({ summary: 'Find customer by phone', description: 'Looks up customer by phone number' })
  @ApiParam({ name: 'phone', description: 'Phone number' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async findByPhone(@Param('phone') phone: string) {
    return this.service.findByPhone(phone);
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get customer by ID', description: 'Returns customer details by UUID' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer found' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Get(':id/details')
  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get customer with tier', description: 'Returns customer with loyalty tier information' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Customer with tier details' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async findWithTier(@Param('id') id: string) {
    return this.service.findWithTier(id);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.CUSTOMERS_UPDATE) // Cashier+
  @ApiOperation({ summary: 'Update customer', description: 'Updates customer information' })
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
  @ApiOperation({ summary: 'Add customer address', description: 'Adds a delivery address for customer' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 201, description: 'Address added' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async addAddress(@Param('id') id: string, @Body() dto: AddAddressDto) {
    return this.service.addAddress({ ...dto, customerId: id });
  }

  @Get(':id/addresses')
  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get customer addresses', description: 'Returns all addresses for customer' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Addresses retrieved' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  async getAddresses(@Param('id') id: string) {
    return this.service.getAddresses(id);
  }

  // ==================== LOYALTY ====================

  @Post(':id/loyalty/redeem')
  @Permissions(PERMISSIONS.CUSTOMERS_LOYALTY_ADJUST) // 🔒 Manager only
  @ApiOperation({ summary: 'Redeem loyalty points', description: 'Redeems customer loyalty points. Manager only.' })
  @ApiParam({ name: 'id', description: 'Customer UUID' })
  @ApiResponse({ status: 200, description: 'Points redeemed' })
  @ApiNotFoundResponse({ description: 'Customer not found' })
  @ApiBadRequestResponse({ description: 'Insufficient points' })
  async redeemPoints(@Param('id') id: string, @Body() dto: RedeemPointsDto) {
    return this.service.redeemPoints(id, dto.points);
  }

  // ==================== TIERS ====================

  @Get('tiers')
  @Permissions(PERMISSIONS.CUSTOMERS_LOYALTY_VIEW) // Cashier+
  @ApiOperation({ summary: 'Get all loyalty tiers', description: 'Returns all loyalty tier configurations' })
  @ApiResponse({ status: 200, description: 'Loyalty tiers retrieved' })
  async getAllTiers() {
    return this.service.getAllTiers();
  }

  @Post('tiers')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Create loyalty tier', description: 'Creates a new loyalty tier. Admin only.' })
  @ApiResponse({ status: 201, description: 'Tier created' })
  @ApiBadRequestResponse({ description: 'Validation error or duplicate tier name' })
  async createTier(@Body() dto: CreateLoyaltyTierDto) {
    return this.service.createTier(dto);
  }

  @Put('tiers/:id')
  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @ApiOperation({ summary: 'Update loyalty tier', description: 'Updates loyalty tier. Admin only.' })
  @ApiParam({ name: 'id', description: 'Tier UUID' })
  @ApiResponse({ status: 200, description: 'Tier updated' })
  @ApiNotFoundResponse({ description: 'Tier not found' })
  async updateTier(@Param('id') id: string, @Body() dto: UpdateLoyaltyTierDto) {
    return this.service.updateTier(id, dto);
  }
}

