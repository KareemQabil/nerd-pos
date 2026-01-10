// Products Controller
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md

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
    CreateModifierDto,
    UpdateModifierDto,
    CreateModifierOptionDto,
    UpdateModifierOptionDto,
    AssignModifierDto,
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

    @Put(':id/availability')
    async setAvailability(
        @Param('id') id: string,
        @Body() body: { isAvailable: boolean },
    ) {
        await this.service.setAvailability(id, body.isAvailable);
        return { message: 'Availability updated' };
    }

    @Delete(':id')
    async deleteProduct(@Param('id') id: string) {
        await this.service.deleteProduct(id);
        return { message: 'Product deleted' };
    }

    // ==================== PRODUCT MODIFIERS ====================

    @Get(':id/modifiers')
    async getProductModifiers(@Param('id') id: string) {
        return this.service.getProductModifiers(id);
    }

    @Post(':id/modifiers')
    async assignModifier(
        @Param('id') productId: string,
        @Body() body: { modifierId: string },
    ) {
        await this.service.assignModifier({ productId, modifierId: body.modifierId });
        return { message: 'Modifier assigned' };
    }

    @Delete(':productId/modifiers/:modifierId')
    async removeModifier(
        @Param('productId') productId: string,
        @Param('modifierId') modifierId: string,
    ) {
        await this.service.removeModifier(productId, modifierId);
        return { message: 'Modifier removed' };
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

// ==================== MODIFIERS CONTROLLER ====================

@Controller('modifiers')
export class ModifiersController {
    constructor(private readonly service: ProductsService) { }

    @Post()
    async createModifier(@Body() dto: CreateModifierDto) {
        return this.service.createModifier(dto);
    }

    @Get()
    async findAllModifiers() {
        return this.service.findAllModifiers();
    }

    @Get(':id')
    async findModifierById(@Param('id') id: string) {
        return this.service.findModifierById(id);
    }

    @Put(':id')
    async updateModifier(@Param('id') id: string, @Body() dto: UpdateModifierDto) {
        return this.service.updateModifier(id, dto);
    }

    @Delete(':id')
    async deleteModifier(@Param('id') id: string) {
        await this.service.deleteModifier(id);
        return { message: 'Modifier deleted' };
    }

    // ==================== MODIFIER OPTIONS ====================

    @Post(':id/options')
    async createModifierOption(
        @Param('id') modifierId: string,
        @Body() dto: Omit<CreateModifierOptionDto, 'modifierId'>,
    ) {
        return this.service.createModifierOption({ ...dto, modifierId });
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
