// FIFO Deduction Strategy
// Source: FINAL/BACKEND/04-MODULE-INVENTORY.md
// CRITICAL: Deducts stock from oldest batches first

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DeductionResult } from '../entities/inventory.entity';
import { BadRequestAppException } from '../../../common/exceptions';
import { ErrorMessages } from '../../../common/constants';
import Decimal from 'decimal.js';

@Injectable()
export class FIFOStrategy {
  constructor(private readonly prisma: PrismaService) {}

  async deduct(
    productId: string,
    warehouseId: string,
    quantity: number,
  ): Promise<DeductionResult[]> {
    // Get inventory item
    const item = await (this.prisma as any).inventoryItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });

    if (!item) {
      throw new BadRequestAppException(ErrorMessages.InventoryNotFound, {
        productId,
        warehouseId,
      });
    }

    // Get batches ordered by receivedDate (FIFO - oldest first)
    const batches = await (this.prisma as any).inventoryBatch.findMany({
      where: {
        inventoryItemId: item.id,
        quantityRemaining: { gt: 0 },
      },
      orderBy: { receivedDate: 'asc' },
    });

    let remaining = new Decimal(quantity);
    const deductions: DeductionResult[] = [];

    for (const batch of batches) {
      if (remaining.lte(0)) break;

      const batchRemaining = new Decimal(batch.quantityRemaining);
      const deductQty = Decimal.min(remaining, batchRemaining);
      const unitCost = new Decimal(batch.costPerUnit);
      const totalCost = unitCost.times(deductQty);

      deductions.push({
        batchId: batch.id,
        quantity: deductQty,
        unitCost: unitCost,
        totalCost: totalCost,
      });

      // Update batch remaining quantity
      await (this.prisma as any).inventoryBatch.update({
        where: { id: batch.id },
        data: { quantityRemaining: batchRemaining.minus(deductQty).toNumber() },
      });

      remaining = remaining.minus(deductQty);
    }

    if (remaining.gt(0)) {
      // FORENSIC AUDIT FIX: Check if product allows negative stock
      const product = await (this.prisma as any).product.findUnique({
        where: { id: productId },
        select: { allowNegativeStock: true },
      });

      if (product?.allowNegativeStock) {
        // Allow negative stock - create virtual negative deduction
        deductions.push({
          batchId: null,
          quantity: remaining,
          unitCost: new Decimal(0), // Will be resolved when stock is added (FIFO)
          totalCost: new Decimal(0),
          isVirtual: true,
        });
      } else {
        throw new BadRequestAppException(ErrorMessages.InsufficientStock, {
          productId,
          shortBy: remaining.toNumber(),
        });
      }
    }

    // Update inventory item total
    const newQuantity = new Decimal(item.quantityOnHand).minus(quantity);
    await (this.prisma as any).inventoryItem.update({
      where: { id: item.id },
      data: { quantityOnHand: newQuantity.toNumber() },
    });

    return deductions;
  }

  async getAvailableStock(
    productId: string,
    warehouseId: string,
  ): Promise<number> {
    const item = await (this.prisma as any).inventoryItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });

    if (!item) return 0;

    const available = new Decimal(item.quantityOnHand).minus(
      item.quantityReserved,
    );
    return available.toNumber();
  }

  async getCOGS(
    productId: string,
    warehouseId: string,
    quantity: number,
  ): Promise<Decimal> {
    // Calculate Cost of Goods Sold using FIFO without actually deducting
    const item = await (this.prisma as any).inventoryItem.findUnique({
      where: { productId_warehouseId: { productId, warehouseId } },
    });

    if (!item) return new Decimal(0);

    const batches = await (this.prisma as any).inventoryBatch.findMany({
      where: {
        inventoryItemId: item.id,
        quantityRemaining: { gt: 0 },
      },
      orderBy: { receivedDate: 'asc' },
    });

    let remaining = new Decimal(quantity);
    let totalCost = new Decimal(0);

    for (const batch of batches) {
      if (remaining.lte(0)) break;

      const deductQty = Decimal.min(
        remaining,
        new Decimal(batch.quantityRemaining),
      );
      const unitCost = new Decimal(batch.costPerUnit);
      totalCost = totalCost.plus(unitCost.times(deductQty));

      remaining = remaining.minus(deductQty);
    }

    return totalCost;
  }
}
