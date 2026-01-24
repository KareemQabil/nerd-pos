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

@ApiTags('Products')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated - JWT token missing or invalid' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) { }

  // ==================== PRODUCT ====================

  @Post()
  @Permissions(PERMISSIONS.PRODUCTS_CREATE) // Manager+
  @ApiOperation({ summary: 'Create new product', description: 'Creates a new product in the catalog. Requires Manager+ role.' })
  @ApiResponse({ status: 201, description: 'Product created successfully' })
  @ApiBadRequestResponse({ description: 'Validation error - invalid input data' })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @ApiOperation({ summary: 'Get all products', description: 'Returns paginated list of all products' })
  @ApiResponse({ status: 200, description: 'Products retrieved successfully' })
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

  @Get('search')
  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @ApiOperation({ summary: 'Search products', description: 'Search products by name, SKU, or barcode' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async searchProducts(@Query('q') query: string) {
    return this.service.searchProducts(query || '');
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @ApiOperation({ summary: 'Get product by ID', description: 'Returns single product with full details' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async findProductById(@Param('id') id: string) {
    return this.service.findProductById(id);
  }

  @Get('sku/:sku')
  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @ApiOperation({ summary: 'Get product by SKU', description: 'Returns product by SKU code' })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiResponse({ status: 200, description: 'Product found' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async findProductBySku(@Param('sku') sku: string) {
    return this.service.findProductBySku(sku);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.PRODUCTS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update product', description: 'Updates product details. Requires Manager+ role.' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product updated successfully' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }

  @Put(':id/deactivate')
  @Permissions(PERMISSIONS.PRODUCTS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Deactivate product', description: 'Soft-deletes product by setting active=false' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product deactivated' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async deactivateProduct(@Param('id') id: string) {
    return this.service.deactivateProduct(id);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.PRODUCTS_DELETE) // 🔒 Admin only
  @ApiOperation({ summary: 'Delete product', description: 'Permanently deletes product. Admin only.' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiNotFoundResponse({ description: 'Product not found' })
  async deleteProduct(@Param('id') id: string) {
    await this.service.deleteProduct(id);
    return { message: 'Product deleted' };
  }

  // ==================== PRODUCT MODIFIER GROUPS ====================

  @Get(':id/modifier-groups')
  @Permissions(PERMISSIONS.MODIFIERS_VIEW) // All roles
  @ApiOperation({ summary: 'Get product modifier groups', description: 'Returns all modifier groups assigned to this product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Modifier groups retrieved' })
  async getProductModifierGroups(@Param('id') id: string) {
    return this.service.getProductModifierGroups(id);
  }

  @Post(':id/modifier-groups')
  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Assign modifier group to product', description: 'Links a modifier group to this product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Modifier group assigned' })
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

  @Delete(':productId/modifier-groups/:groupId')
  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Remove modifier group from product', description: 'Unlinks a modifier group from this product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'groupId', description: 'Modifier Group UUID' })
  @ApiResponse({ status: 200, description: 'Modifier group removed' })
  async removeModifierGroup(
    @Param('productId') productId: string,
    @Param('groupId') groupId: string,
  ) {
    await this.service.removeModifierGroup(productId, groupId);
    return { message: 'Modifier group removed' };
  }
}

// ==================== CATEGORIES CONTROLLER ====================

@ApiTags('Categories')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: ProductsService) { }

  @Post()
  @Permissions(PERMISSIONS.CATEGORIES_CREATE) // Manager+
  @ApiOperation({ summary: 'Create category', description: 'Creates a new product category. Manager+ role required.' })
  @ApiResponse({ status: 201, description: 'Category created successfully' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.CATEGORIES_VIEW) // All roles
  @ApiOperation({ summary: 'Get all categories', description: 'Returns paginated list of categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async findAllCategories(@Query() pagination: PaginationDto) {
    const result = await this.service.findAllCategoriesPaginated({
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

  @Get('root')
  @Permissions(PERMISSIONS.CATEGORIES_VIEW) // All roles
  @ApiOperation({ summary: 'Get root categories', description: 'Returns top-level categories (no parent)' })
  @ApiResponse({ status: 200, description: 'Root categories retrieved' })
  async findRootCategories() {
    return this.service.findRootCategories();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CATEGORIES_VIEW) // All roles
  @ApiOperation({ summary: 'Get category by ID', description: 'Returns single category with subcategories' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category found' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async findCategoryById(@Param('id') id: string) {
    return this.service.findCategoryById(id);
  }

  @Get(':id/products')
  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @ApiOperation({ summary: 'Get products in category', description: 'Returns all products belonging to this category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Products retrieved' })
  async findProductsByCategory(@Param('id') id: string) {
    return this.service.findProductsByCategory(id);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.CATEGORIES_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update category', description: 'Updates category details. Manager+ role required.' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CATEGORIES_DELETE) // 🔒 Admin only
  @ApiOperation({ summary: 'Delete category', description: 'Deletes category. Admin only.' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiNotFoundResponse({ description: 'Category not found' })
  async deleteCategory(@Param('id') id: string) {
    await this.service.deleteCategory(id);
    return { message: 'Category deleted' };
  }
}

// ==================== MODIFIER GROUPS CONTROLLER ====================

@ApiTags('Modifier Groups')
@ApiBearerAuth('JWT')
@ApiUnauthorizedResponse({ description: 'Not authenticated' })
@ApiForbiddenResponse({ description: 'Missing required permissions' })
@Controller('modifier-groups')
export class ModifierGroupsController {
  constructor(private readonly service: ProductsService) { }

  @Post()
  @Permissions(PERMISSIONS.MODIFIERS_CREATE) // Manager+
  @ApiOperation({ summary: 'Create modifier group', description: 'Creates a new modifier group (e.g., Size, Toppings)' })
  @ApiResponse({ status: 201, description: 'Modifier group created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async createModifierGroup(@Body() dto: CreateModifierGroupDto) {
    return this.service.createModifierGroup(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.MODIFIERS_VIEW) // All roles
  @ApiOperation({ summary: 'Get all modifier groups', description: 'Returns paginated list of modifier groups' })
  @ApiResponse({ status: 200, description: 'Modifier groups retrieved' })
  async findAllModifierGroups(@Query() pagination: PaginationDto) {
    const result = await this.service.findAllModifierGroupsPaginated({
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
  @Permissions(PERMISSIONS.MODIFIERS_VIEW) // All roles
  @ApiOperation({ summary: 'Get modifier group by ID', description: 'Returns modifier group with all options' })
  @ApiParam({ name: 'id', description: 'Modifier Group UUID' })
  @ApiResponse({ status: 200, description: 'Modifier group found' })
  @ApiNotFoundResponse({ description: 'Modifier group not found' })
  async findModifierGroupById(@Param('id') id: string) {
    return this.service.findModifierGroupById(id);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update modifier group', description: 'Updates modifier group details' })
  @ApiParam({ name: 'id', description: 'Modifier Group UUID' })
  @ApiResponse({ status: 200, description: 'Modifier group updated' })
  @ApiNotFoundResponse({ description: 'Modifier group not found' })
  async updateModifierGroup(
    @Param('id') id: string,
    @Body() dto: UpdateModifierGroupDto,
  ) {
    return this.service.updateModifierGroup(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MODIFIERS_DELETE) // 🔒 Admin only
  @ApiOperation({ summary: 'Delete modifier group', description: 'Deletes modifier group and all its options. Admin only.' })
  @ApiParam({ name: 'id', description: 'Modifier Group UUID' })
  @ApiResponse({ status: 200, description: 'Modifier group deleted' })
  @ApiNotFoundResponse({ description: 'Modifier group not found' })
  async deleteModifierGroup(@Param('id') id: string) {
    await this.service.deleteModifierGroup(id);
    return { message: 'Modifier group deleted' };
  }

  // ==================== MODIFIER OPTIONS ====================

  @Post(':id/options')
  @Permissions(PERMISSIONS.MODIFIERS_CREATE) // Manager+
  @ApiOperation({ summary: 'Create modifier option', description: 'Adds new option to modifier group' })
  @ApiParam({ name: 'id', description: 'Modifier Group UUID' })
  @ApiResponse({ status: 201, description: 'Modifier option created' })
  @ApiBadRequestResponse({ description: 'Validation error' })
  async createModifierOption(
    @Param('id') groupId: string,
    @Body() dto: Omit<CreateModifierOptionDto, 'groupId'>,
  ) {
    return this.service.createModifierOption({ ...dto, groupId });
  }

  @Put('options/:id')
  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update modifier option', description: 'Updates modifier option details' })
  @ApiParam({ name: 'id', description: 'Modifier Option UUID' })
  @ApiResponse({ status: 200, description: 'Modifier option updated' })
  @ApiNotFoundResponse({ description: 'Modifier option not found' })
  async updateModifierOption(
    @Param('id') id: string,
    @Body() dto: UpdateModifierOptionDto,
  ) {
    return this.service.updateModifierOption(id, dto);
  }

  @Delete('options/:id')
  @Permissions(PERMISSIONS.MODIFIERS_DELETE) // 🔒 Admin only
  @ApiOperation({ summary: 'Delete modifier option', description: 'Deletes modifier option. Admin only.' })
  @ApiParam({ name: 'id', description: 'Modifier Option UUID' })
  @ApiResponse({ status: 200, description: 'Modifier option deleted' })
  @ApiNotFoundResponse({ description: 'Modifier option not found' })
  async deleteModifierOption(@Param('id') id: string) {
    await this.service.deleteModifierOption(id);
    return { message: 'Modifier option deleted' };
  }
}
