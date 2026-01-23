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

@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) { }

  // ==================== CUSTOMER CRUD ====================

  @Permissions(PERMISSIONS.CUSTOMERS_CREATE) // Cashier+
  @Post()
  async create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @Get('search')
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

  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @Get('phone/:phone')
  async findByPhone(@Param('phone') phone: string) {
    return this.service.findByPhone(phone);
  }

  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @Get(':id/details')
  async findWithTier(@Param('id') id: string) {
    return this.service.findWithTier(id);
  }

  @Permissions(PERMISSIONS.CUSTOMERS_UPDATE) // Cashier+
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(id, dto);
  }

  // ==================== ADDRESSES ====================

  @Permissions(PERMISSIONS.CUSTOMERS_UPDATE) // Cashier+
  @Post(':id/addresses')
  async addAddress(@Param('id') id: string, @Body() dto: AddAddressDto) {
    return this.service.addAddress({ ...dto, customerId: id });
  }

  @Permissions(PERMISSIONS.CUSTOMERS_VIEW) // Cashier+
  @Get(':id/addresses')
  async getAddresses(@Param('id') id: string) {
    return this.service.getAddresses(id);
  }

  // ==================== LOYALTY ====================

  @Permissions(PERMISSIONS.CUSTOMERS_LOYALTY_ADJUST) // 🔒 Manager only
  @Post(':id/loyalty/redeem')
  async redeemPoints(@Param('id') id: string, @Body() dto: RedeemPointsDto) {
    return this.service.redeemPoints(id, dto.points);
  }

  // ==================== TIERS ====================

  @Permissions(PERMISSIONS.CUSTOMERS_LOYALTY_VIEW) // Cashier+
  @Get('tiers')
  async getAllTiers() {
    return this.service.getAllTiers();
  }

  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @Post('tiers')
  async createTier(@Body() dto: CreateLoyaltyTierDto) {
    return this.service.createTier(dto);
  }

  @Permissions(PERMISSIONS.SETTINGS_UPDATE) // 🔒 Admin only
  @Put('tiers/:id')
  async updateTier(@Param('id') id: string, @Body() dto: UpdateLoyaltyTierDto) {
    return this.service.updateTier(id, dto);
  }
}
