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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { MessageResponseDto, PaginationDto, PaginatedResponseDto } from '../../common/dto';
import {
  CreateProductDto,
  UpdateProductDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  CreateModifierOptionDto,
  UpdateModifierOptionDto,
  ProductResponseDto,
  ProductListItemDto,
  ProductPaginatedResponseDto,
  CategoryResponseDto,
  CategoryPaginatedResponseDto,
  ModifierGroupResponseDto,
  ModifierOptionResponseDto,
  ModifierGroupPaginatedResponseDto,
} from './dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../core/constants/permissions';
import { examples } from '../../common/fixtures/swagger-examples';
import { ApiErrorResponse, ApiResultResponse } from '../../common/decorators';

@ApiTags('Products')
@ApiBearerAuth('JWT')
@ApiErrorResponse({ status: 401, description: 'Not authenticated - JWT token missing or invalid' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly service: ProductsService) { }

  // ==================== PRODUCT ====================

  @Post()
  @Permissions(PERMISSIONS.PRODUCTS_CREATE) // Manager+
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({ schema: { example: examples.products.createProductRequest.value } })
  @ApiResultResponse({
    status: 201,
    description: 'Product created successfully',
    type: ProductResponseDto,
  })
  @ApiErrorResponse({ status: 401, description: 'Unauthorized' })
  @ApiErrorResponse({ status: 422, description: 'Validation error' })
  async createProduct(@Body() dto: CreateProductDto) {
    return this.service.createProduct(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @ApiOperation({ summary: 'Get all products (paginated)' })
  @ApiResultResponse({
    status: 200,
    description: 'List of products',
    type: ProductPaginatedResponseDto,
  })
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
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiResultResponse({
    status: 200,
    description: 'Search results',
    type: ProductListItemDto,
    isArray: true,
  })
  async searchProducts(@Query('q') query: string) {
    return this.service.searchProducts(query || '');
  }

  @Get(':id')
  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @ApiOperation({ summary: 'Get product by ID' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResultResponse({ status: 200, description: 'Product found', type: ProductResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Product not found' })
  async findProductById(@Param('id') id: string) {
    return this.service.findProductById(id);
  }

  @Get('sku/:sku')
  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @ApiOperation({ summary: 'Get product by SKU' })
  @ApiParam({ name: 'sku', description: 'Product SKU' })
  @ApiResultResponse({ status: 200, description: 'Product found', type: ProductResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Product not found' })
  async findProductBySku(@Param('sku') sku: string) {
    return this.service.findProductBySku(sku);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.PRODUCTS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResultResponse({ status: 200, description: 'Product updated successfully', type: ProductResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Product not found' })
  @ApiErrorResponse({ status: 400, description: 'Validation error' })
  async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.service.updateProduct(id, dto);
  }

  @Put(':id/deactivate')
  @Permissions(PERMISSIONS.PRODUCTS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Deactivate product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResultResponse({ status: 200, description: 'Product deactivated', type: ProductResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Product not found' })
  async deactivateProduct(@Param('id') id: string) {
    return this.service.deactivateProduct(id);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.PRODUCTS_DELETE) // 🔒 Admin only
  @ApiOperation({ summary: 'Delete product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResultResponse({ status: 200, description: 'Product deleted', type: MessageResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Product not found' })
  async deleteProduct(@Param('id') id: string) {
    await this.service.deleteProduct(id);
    return { message: 'Product deleted' };
  }

  // ==================== PRODUCT MODIFIER GROUPS ====================

  @Get(':id/modifier-groups')
  @Permissions(PERMISSIONS.MODIFIERS_VIEW) // All roles
  @ApiOperation({ summary: 'Get product modifier groups' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Modifier groups retrieved',
    type: ModifierGroupResponseDto,
    isArray: true,
  })
  async getProductModifierGroups(@Param('id') id: string) {
    return this.service.getProductModifierGroups(id);
  }

  @Post(':id/modifier-groups')
  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Assign modifier group to product' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResultResponse({ status: 200, description: 'Modifier group assigned', type: MessageResponseDto })
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
  @ApiOperation({ summary: 'Remove modifier group from product' })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiParam({ name: 'groupId', description: 'Modifier Group UUID' })
  @ApiResultResponse({ status: 200, description: 'Modifier group removed', type: MessageResponseDto })
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
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('categories')
export class CategoriesController {
  constructor(private readonly service: ProductsService) { }

  @Post()
  @Permissions(PERMISSIONS.CATEGORIES_CREATE) // Manager+
  @ApiOperation({ summary: 'Create category' })
  @ApiBody({ schema: { example: examples.products.createCategoryRequest.value } })
  @ApiResultResponse({
    status: 201,
    description: 'Category created successfully',
    type: CategoryResponseDto,
  })
  @ApiErrorResponse({ status: 401, description: 'Unauthorized' })
  @ApiErrorResponse({ status: 422, description: 'Validation error' })
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.CATEGORIES_VIEW) // All roles
  @ApiOperation({ summary: 'Get all categories', description: 'Returns paginated list of categories' })
  @ApiResultResponse({
    status: 200,
    description: 'Categories retrieved successfully',
    type: CategoryPaginatedResponseDto,
  })
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
  @ApiOperation({ summary: 'Get root categories' })
  @ApiResultResponse({
    status: 200,
    description: 'Root categories retrieved',
    type: CategoryResponseDto,
    isArray: true,
  })
  async findRootCategories() {
    return this.service.findRootCategories();
  }

  @Get(':id')
  @Permissions(PERMISSIONS.CATEGORIES_VIEW) // All roles
  @ApiOperation({ summary: 'Get category by ID' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResultResponse({ status: 200, description: 'Category found', type: CategoryResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Category not found' })
  async findCategoryById(@Param('id') id: string) {
    return this.service.findCategoryById(id);
  }

  @Get(':id/products')
  @Permissions(PERMISSIONS.PRODUCTS_VIEW) // All roles
  @ApiOperation({ summary: 'Get products in category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResultResponse({
    status: 200,
    description: 'Products retrieved',
    type: ProductListItemDto,
    isArray: true,
  })
  async findProductsByCategory(@Param('id') id: string) {
    return this.service.findProductsByCategory(id);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.CATEGORIES_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResultResponse({ status: 200, description: 'Category updated', type: CategoryResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Category not found' })
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.CATEGORIES_DELETE) // 🔒 Admin only
  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResultResponse({ status: 200, description: 'Category deleted', type: MessageResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Category not found' })
  async deleteCategory(@Param('id') id: string) {
    await this.service.deleteCategory(id);
    return { message: 'Category deleted' };
  }
}

// ==================== MODIFIER GROUPS CONTROLLER ====================

@ApiTags('Modifier Groups')
@ApiBearerAuth('JWT')
@ApiErrorResponse({ status: 401, description: 'Not authenticated' })
@ApiErrorResponse({ status: 403, description: 'Missing required permissions' })
@Controller('modifier-groups')
export class ModifierGroupsController {
  constructor(private readonly service: ProductsService) { }

  @Post()
  @Permissions(PERMISSIONS.MODIFIERS_CREATE) // Manager+
  @ApiOperation({ summary: 'Create modifier group' })
  @ApiResultResponse({
    status: 201,
    description: 'Modifier group created',
    type: ModifierGroupResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Validation error' })
  async createModifierGroup(@Body() dto: CreateModifierGroupDto) {
    return this.service.createModifierGroup(dto);
  }

  @Get()
  @Permissions(PERMISSIONS.MODIFIERS_VIEW) // All roles
  @ApiOperation({ summary: 'Get all modifier groups', description: 'Returns paginated list of modifier groups' })
  @ApiResultResponse({
    status: 200,
    description: 'Modifier groups retrieved',
    type: ModifierGroupPaginatedResponseDto,
  })
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
  @ApiOperation({ summary: 'Get modifier group by ID' })
  @ApiParam({ name: 'id', description: 'Modifier Group UUID' })
  @ApiResultResponse({ status: 200, description: 'Modifier group found', type: ModifierGroupResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Modifier group not found' })
  async findModifierGroupById(@Param('id') id: string) {
    return this.service.findModifierGroupById(id);
  }

  @Put(':id')
  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update modifier group' })
  @ApiParam({ name: 'id', description: 'Modifier Group UUID' })
  @ApiResultResponse({ status: 200, description: 'Modifier group updated', type: ModifierGroupResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Modifier group not found' })
  async updateModifierGroup(
    @Param('id') id: string,
    @Body() dto: UpdateModifierGroupDto,
  ) {
    return this.service.updateModifierGroup(id, dto);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.MODIFIERS_DELETE) // 🔒 Admin only
  @ApiOperation({ summary: 'Delete modifier group' })
  @ApiParam({ name: 'id', description: 'Modifier Group UUID' })
  @ApiResultResponse({ status: 200, description: 'Modifier group deleted', type: MessageResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Modifier group not found' })
  async deleteModifierGroup(@Param('id') id: string) {
    await this.service.deleteModifierGroup(id);
    return { message: 'Modifier group deleted' };
  }

  // ==================== MODIFIER OPTIONS ====================

  @Post(':id/options')
  @Permissions(PERMISSIONS.MODIFIERS_CREATE) // Manager+
  @ApiOperation({ summary: 'Add option to modifier group' })
  @ApiParam({ name: 'id', description: 'Modifier Group UUID' })
  @ApiResultResponse({
    status: 201,
    description: 'Modifier option created',
    type: ModifierOptionResponseDto,
  })
  @ApiErrorResponse({ status: 400, description: 'Validation error' })
  async createModifierOption(
    @Param('id') groupId: string,
    @Body() dto: Omit<CreateModifierOptionDto, 'groupId'>,
  ) {
    return this.service.createModifierOption({ ...dto, groupId });
  }

  @Put('options/:id')
  @Permissions(PERMISSIONS.MODIFIERS_UPDATE) // Manager+
  @ApiOperation({ summary: 'Update modifier option' })
  @ApiParam({ name: 'id', description: 'Modifier Option UUID' })
  @ApiResultResponse({ status: 200, description: 'Modifier option updated', type: ModifierOptionResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Modifier option not found' })
  async updateModifierOption(
    @Param('id') id: string,
    @Body() dto: UpdateModifierOptionDto,
  ) {
    return this.service.updateModifierOption(id, dto);
  }

  @Delete('options/:id')
  @Permissions(PERMISSIONS.MODIFIERS_DELETE) // 🔒 Admin only
  @ApiOperation({ summary: 'Delete modifier option' })
  @ApiParam({ name: 'id', description: 'Modifier Option UUID' })
  @ApiResultResponse({ status: 200, description: 'Modifier option deleted', type: MessageResponseDto })
  @ApiErrorResponse({ status: 404, description: 'Modifier option not found' })
  async deleteModifierOption(@Param('id') id: string) {
    await this.service.deleteModifierOption(id);
    return { message: 'Modifier option deleted' };
  }
}
