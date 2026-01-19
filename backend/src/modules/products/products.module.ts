// Products Module
// Source: FINAL/BACKEND/03-MODULE-PRODUCTS.md

import { Module } from '@nestjs/common';
import {
  ProductsController,
  CategoriesController,
  ModifierGroupsController,
} from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';

@Module({
  controllers: [
    ProductsController,
    CategoriesController,
    ModifierGroupsController,
  ],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService],
})
export class ProductsModule {}
