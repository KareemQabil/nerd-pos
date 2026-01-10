// Products Controller
// Source: WORKFLOWS-BACKEND/01-create-module.md

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
import { CreateProductDto, UpdateProductDto } from './dto';

@Controller('products')
export class ProductsController {
    constructor(private readonly service: ProductsService) { }

    @Post()
    async create(@Body() dto: CreateProductDto) {
        return this.service.create(dto);
    }

    @Get()
    async findAll() {
        return this.service.findAll();
    }

    @Get('search')
    async search(@Query('q') query: string) {
        return this.service.search(query || '');
    }

    @Get('category/:categoryId')
    async findByCategory(@Param('categoryId') categoryId: string) {
        return this.service.findByCategory(categoryId);
    }

    @Get('sku/:sku')
    async findBySku(@Param('sku') sku: string) {
        return this.service.findBySku(sku);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.service.findById(id);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
        return this.service.update(id, dto);
    }

    @Put(':id/deactivate')
    async deactivate(@Param('id') id: string) {
        return this.service.deactivate(id);
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.service.delete(id);
        return { message: 'Product deleted successfully' };
    }
}
