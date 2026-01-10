// Products Controller
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md
// Aligned with: prisma/schema.prisma

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
import { ProductsService } from './products.service';
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

@Controller('products')
export class ProductsController {
    constructor(private readonly service: ProductsService) { }

    // ==================== PRODUCT ====================

    @Post()
    async createProduct(@Body() dto: CreateProductDto) {
        return this.service.createProduct(dto);
    }

    @Get()
    async findAllProducts() {
        return this.service.findAllProducts();
    }

    @Get('search')
    async searchProducts(@Query('q') query: string) {
        return this.service.searchProducts(query || '');
    }

    @Get(':id')
    async findProductById(@Param('id') id: string) {
        return this.service.findProductById(id);
    }

    @Get('sku/:sku')
    async findProductBySku(@Param('sku') sku: string) {
        return this.service.findProductBySku(sku);
    }

    @Put(':id')
    async updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
        return this.service.updateProduct(id, dto);
    }

    @Put(':id/deactivate')
    async deactivateProduct(@Param('id') id: string) {
        return this.service.deactivateProduct(id);
    }

    @Delete(':id')
    async deleteProduct(@Param('id') id: string) {
        await this.service.deleteProduct(id);
        return { message: 'Product deleted' };
    }

    // ==================== PRODUCT MODIFIER GROUPS ====================

    @Get(':id/modifier-groups')
    async getProductModifierGroups(@Param('id') id: string) {
        return this.service.getProductModifierGroups(id);
    }

    @Post(':id/modifier-groups')
    async assignModifierGroup(
        @Param('id') productId: string,
        @Body() body: { groupId: string },
    ) {
        await this.service.assignModifierGroup({ productId, groupId: body.groupId });
        return { message: 'Modifier group assigned' };
    }

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

    @Post()
    async createCategory(@Body() dto: CreateCategoryDto) {
        return this.service.createCategory(dto);
    }

    @Get()
    async findAllCategories() {
        return this.service.findAllCategories();
    }

    @Get('root')
    async findRootCategories() {
        return this.service.findRootCategories();
    }

    @Get(':id')
    async findCategoryById(@Param('id') id: string) {
        return this.service.findCategoryById(id);
    }

    @Get(':id/products')
    async findProductsByCategory(@Param('id') id: string) {
        return this.service.findProductsByCategory(id);
    }

    @Put(':id')
    async updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
        return this.service.updateCategory(id, dto);
    }

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

    @Post()
    async createModifierGroup(@Body() dto: CreateModifierGroupDto) {
        return this.service.createModifierGroup(dto);
    }

    @Get()
    async findAllModifierGroups() {
        return this.service.findAllModifierGroups();
    }

    @Get(':id')
    async findModifierGroupById(@Param('id') id: string) {
        return this.service.findModifierGroupById(id);
    }

    @Put(':id')
    async updateModifierGroup(@Param('id') id: string, @Body() dto: UpdateModifierGroupDto) {
        return this.service.updateModifierGroup(id, dto);
    }

    @Delete(':id')
    async deleteModifierGroup(@Param('id') id: string) {
        await this.service.deleteModifierGroup(id);
        return { message: 'Modifier group deleted' };
    }

    // ==================== MODIFIER OPTIONS ====================

    @Post(':id/options')
    async createModifierOption(
        @Param('id') groupId: string,
        @Body() dto: Omit<CreateModifierOptionDto, 'groupId'>,
    ) {
        return this.service.createModifierOption({ ...dto, groupId });
    }

    @Put('options/:id')
    async updateModifierOption(
        @Param('id') id: string,
        @Body() dto: UpdateModifierOptionDto,
    ) {
        return this.service.updateModifierOption(id, dto);
    }

    @Delete('options/:id')
    async deleteModifierOption(@Param('id') id: string) {
        await this.service.deleteModifierOption(id);
        return { message: 'Modifier option deleted' };
    }
}
