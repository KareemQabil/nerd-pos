// Products Module
// Source: WORKFLOWS-BACKEND/01-create-module.md

import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';

@Module({
    controllers: [ProductsController],
    providers: [ProductsService, ProductsRepository],
    exports: [ProductsService],
})
export class ProductsModule { }
