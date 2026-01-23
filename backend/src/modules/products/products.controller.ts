// Products Controller
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
// Aligned with: prisma/schema.prisma
// Security: Block 2 - All endpoints secured with @Permissions

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  CreateModifierOptionDto,
  UpdateModifierOptionDto,
  AssignModifierGroupDto,
} from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';

@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) { }

  // ==================== PRODUCT ====================

  @Permissions(PERMISSIONS.PRODUCTS_CREATE) // Manager+
  @Post()
  async createProduct(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @Get()
  async findAllProducts(@Query() pagination: PaginationDto) {
    const result = await this.service.findAllProductsPaginated({
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

  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @Get('search')
  async searchProducts(@Query('q') query: string) {
    return this.service.searchProducts(query || '');
  }

  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @Get(':id')
  async findProductById(@Param('id') id: string) {
    return this.service.findProductById(id);
  }

  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @Get('sku/:sku')
  async findProductBySku(@Param('sku') sku: string) {
    return this.service.findProductBySku(sku);
  }

  @Permissions(PERMISSIONS.PRODUCTS_UPDATE) // Manager+
  @Put(':id')
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }

  @Permissions(PERMISSIONS.PRODUCTS_UPDATE) // Manager+
  @Put(':id/deactivate')
  async deactivateProduct(@Param('id') id: string) {
    return this.service.deactivateProduct(id);
  }

  @Permissions(PERMISSIONS.PRODUCTS_DELETE) // 🔒 Admin only
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    await this.service.deleteProduct(id);
    return { message: 'Product deleted' };
  }

  // ==================== PRODUCT MODIFIER GROUPS ====================

  @Permissions(PERMISSIONS.MODIFIERS_VIEW) // All roles
  @Get(':id/modifier-groups')
  async getProductModifierGroups(@Param('id') id: string) {
    return this.service.getProductModifierGroups(id);
  }

  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @Post(':id/modifier-groups')
  async assignModifierGroup(
    @Param('id') productId: string,
    @Body() body: { groupId: string },
  ) {
    await this.service.assignModifierGroup({
      productId,
      groupId: body.groupId,
    });
    return { message: 'Modifier group assigned' };
  }

  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @Delete(':productId/modifier-groups/:groupId')
  async removeModifierGroup(
    @Param('productId') productId: string,
    @Param('groupId') groupId: string,
  ) {
    await this.service.removeModifierGroup(productId, groupId);
    return { message: 'Modifier group removed' };
  }
}

// ==================== CATEGORIES CONTROLLER ====================

@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: ProductsService) { }

  @Permissions(PERMISSIONS.CATEGORIES_CREATE) // Manager+
  @Post()
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Permissions(PERMISSIONS.CATEGORIES_VIEW) // All roles
  @Get()
  async findAllCategories() {
    return this.service.findAllCategories();
  }

  @Permissions(PERMISSIONS.CATEGORIES_VIEW) // All roles
  @Get('root')
  async findRootCategories() {
    return this.service.findRootCategories();
  }

  @Permissions(PERMISSIONS.CATEGORIES_VIEW) // All roles
  @Get(':id')
  async findCategoryById(@Param('id') id: string) {
    return this.service.findCategoryById(id);
  }

  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @Get(':id/products')
  async findProductsByCategory(@Param('id') id: string) {
    return this.service.findProductsByCategory(id);
  }

  @Permissions(PERMISSIONS.CATEGORIES_UPDATE) // Manager+
  @Put(':id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(id, dto);
  }

  @Permissions(PERMISSIONS.CATEGORIES_DELETE) // 🔒 Admin only
  @Delete(':id')
  async deleteCategory(@Param('id') id: string) {
    await this.service.deleteCategory(id);
    return { message: 'Category deleted' };
  }
}

// ==================== MODIFIER GROUPS CONTROLLER ====================

@Controller('modifier-groups')
export class ModifierGroupsController {
  constructor(private readonly service: ProductsService) { }

  @Permissions(PERMISSIONS.MODIFIERS_CREATE) // Manager+
  @Post()
  async createModifierGroup(@Body() dto: CreateModifierGroupDto) {
    return this.service.createModifierGroup(dto);
  }

  @Permissions(PERMISSIONS.MODIFIERS_VIEW) // All roles
  @Get()
  async findAllModifierGroups() {
    return this.service.findAllModifierGroups();
  }

  @Permissions(PERMISSIONS.MODIFIERS_VIEW) // All roles
  @Get(':id')
  async findModifierGroupById(@Param('id') id: string) {
    return this.service.findModifierGroupById(id);
  }

  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @Put(':id')
  async updateModifierGroup(
    @Param('id') id: string,
    @Body() dto: UpdateModifierGroupDto,
  ) {
    return this.service.updateModifierGroup(id, dto);
  }

  @Permissions(PERMISSIONS.MODIFIERS_DELETE) // 🔒 Admin only
  @Delete(':id')
  async deleteModifierGroup(@Param('id') id: string) {
    await this.service.deleteModifierGroup(id);
    return { message: 'Modifier group deleted' };
  }

  // ==================== MODIFIER OPTIONS ====================

  @Permissions(PERMISSIONS.MODIFIERS_CREATE) // Manager+
  @Post(':id/options')
  async createModifierOption(
    @Param('id') groupId: string,
    @Body() dto: Omit<CreateModifierOptionDto, 'groupId'>,
  ) {
    return this.service.createModifierOption({ ...dto, groupId });
  }

  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @Put('options/:id')
  async updateModifierOption(
    @Param('id') id: string,
    @Body() dto: UpdateModifierOptionDto,
  ) {
    return this.service.updateModifierOption(id, dto);
  }

  @Permissions(PERMISSIONS.MODIFIERS_DELETE) // 🔒 Admin only
  @Delete('options/:id')
  async deleteModifierOption(@Param('id') id: string) {
    await this.service.deleteModifierOption(id);
    return { message: 'Modifier option deleted' };
  }
}
