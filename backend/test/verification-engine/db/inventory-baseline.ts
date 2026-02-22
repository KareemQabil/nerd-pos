import { Prisma, PrismaClient } from '@prisma/client';
import { getCoreSeedRefs } from '../seed/core-seed-pack';

type InventoryBaselineItem = {
  productId: string;
  warehouseId: string;
  quantityOnHand: string;
  quantityReserved: string;
  minimumLevel: string;
  maximumLevel: string | null;
  reorderPoint: string;
  averageCost: string;
};

type InventoryBatchBaseline = {
  inventoryItemId: string;
  batchNumber: string | null;
  receivedDate: string;
  expiryDate: string | null;
  quantityReceived: string;
  quantityRemaining: string;
  costPerUnit: string;
  isVirtualNegative: boolean;
};

let baseline: InventoryBaselineItem[] | null = null;
let batchBaseline: InventoryBatchBaseline[] | null = null;
let baselineLoadPromise: Promise<void> | null = null;

const toStringValue = (value: Prisma.Decimal | null): string | null => {
  if (value === null) return null;
  return value.toString();
};

export const ensureInventoryBaseline = async (
  prisma: PrismaClient,
): Promise<void> => {
  if (baselineLoadPromise) {
    return baselineLoadPromise;
  }

  baselineLoadPromise = (async () => {
    try {
      const refs = getCoreSeedRefs();
      const productIds = refs.products.map((product) => product.id);

      const items = await prisma.inventoryItem.findMany({
        where: {
          productId: { in: productIds },
          warehouseId: refs.warehouseId,
        },
        select: {
          id: true,
          productId: true,
          warehouseId: true,
          quantityOnHand: true,
          quantityReserved: true,
          minimumLevel: true,
          maximumLevel: true,
          reorderPoint: true,
          averageCost: true,
        },
      });

      baseline = items.map((item) => ({
        productId: item.productId,
        warehouseId: item.warehouseId,
        quantityOnHand: item.quantityOnHand.toString(),
        quantityReserved: item.quantityReserved.toString(),
        minimumLevel: item.minimumLevel.toString(),
        maximumLevel: toStringValue(item.maximumLevel),
        reorderPoint: item.reorderPoint.toString(),
        averageCost: item.averageCost.toString(),
      }));

      const batches = await prisma.inventoryBatch.findMany({
        where: {
          inventoryItemId: { in: items.map((item) => item.id) },
        },
        select: {
          inventoryItemId: true,
          batchNumber: true,
          receivedDate: true,
          expiryDate: true,
          quantityReceived: true,
          quantityRemaining: true,
          costPerUnit: true,
          isVirtualNegative: true,
        },
      });

      batchBaseline = batches.map((batch) => ({
        inventoryItemId: batch.inventoryItemId,
        batchNumber: batch.batchNumber ?? null,
        receivedDate: batch.receivedDate.toISOString(),
        expiryDate: batch.expiryDate ? batch.expiryDate.toISOString() : null,
        quantityReceived: batch.quantityReceived.toString(),
        quantityRemaining: batch.quantityRemaining.toString(),
        costPerUnit: batch.costPerUnit.toString(),
        isVirtualNegative: batch.isVirtualNegative,
      }));
    } catch (error: any) {
      // eslint-disable-next-line no-console
      console.error('[verification-engine] inventory baseline load failed', {
        code: error?.code,
        message: error?.message,
        meta: error?.meta,
      });
      throw error;
    }
  })();

  return baselineLoadPromise;
};

export const restoreInventoryBaseline = async (
  prisma: PrismaClient,
): Promise<void> => {
  await ensureInventoryBaseline(prisma);
  if (!baseline || baseline.length === 0) {
    return;
  }

  const updates = baseline.map((item) =>
    prisma.inventoryItem.upsert({
      where: {
        productId_warehouseId: {
          productId: item.productId,
          warehouseId: item.warehouseId,
        },
      },
      update: {
        quantityOnHand: new Prisma.Decimal(item.quantityOnHand),
        quantityReserved: new Prisma.Decimal(item.quantityReserved),
        minimumLevel: new Prisma.Decimal(item.minimumLevel),
        maximumLevel: item.maximumLevel
          ? new Prisma.Decimal(item.maximumLevel)
          : null,
        reorderPoint: new Prisma.Decimal(item.reorderPoint),
        averageCost: new Prisma.Decimal(item.averageCost),
      },
      create: {
        productId: item.productId,
        warehouseId: item.warehouseId,
        quantityOnHand: new Prisma.Decimal(item.quantityOnHand),
        quantityReserved: new Prisma.Decimal(item.quantityReserved),
        minimumLevel: new Prisma.Decimal(item.minimumLevel),
        maximumLevel: item.maximumLevel
          ? new Prisma.Decimal(item.maximumLevel)
          : null,
        reorderPoint: new Prisma.Decimal(item.reorderPoint),
        averageCost: new Prisma.Decimal(item.averageCost),
      },
    }),
  );

  const batchSize = 200;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await prisma.$transaction(batch);
  }

  if (batchBaseline && batchBaseline.length > 0) {
    await prisma.inventoryBatch.createMany({
      data: batchBaseline.map((batch) => ({
        inventoryItemId: batch.inventoryItemId,
        batchNumber: batch.batchNumber ?? null,
        receivedDate: new Date(batch.receivedDate),
        expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
        quantityReceived: new Prisma.Decimal(batch.quantityReceived),
        quantityRemaining: new Prisma.Decimal(batch.quantityRemaining),
        costPerUnit: new Prisma.Decimal(batch.costPerUnit),
        isVirtualNegative: batch.isVirtualNegative,
      })),
    });
  }
};
