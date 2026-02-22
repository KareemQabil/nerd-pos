import { Prisma } from '@prisma/client';
import { resetTransactionalState } from '../../db/sandbox';
import { openSession } from '../../factories/register-session.factory';
import { asAdmin } from '../../auth/auth-headers';
import { getHttp, getPrisma } from '../../runtime/test-context';
import { getCoreRefs } from '../../seed/core-refs-resolver';

describe('workflow: inventory deduction', () => {
  beforeAll(async () => {
    await resetTransactionalState();
  });

  it('decrements stock on order creation and prevents oversell', async () => {
    const session = await openSession();
    const refs = await getCoreRefs();
    const prisma = await getPrisma();
    const product = refs.products[0];
    const warehouseId = refs.warehouse.id;

    const stockedProduct = await (async () => {
      for (const candidate of refs.products) {
        const item = await prisma.inventoryItem.findUnique({
          where: {
            productId_warehouseId: {
              productId: candidate.id,
              warehouseId,
            },
          },
        });

        if (!item) {
          continue;
        }

        const qty = new Prisma.Decimal(item.quantityOnHand).toNumber();
        if (qty >= 2) {
          return candidate;
        }
      }

      return product;
    })();

    const before = await prisma.inventoryItem.findUnique({
      where: {
        productId_warehouseId: {
          productId: stockedProduct.id,
          warehouseId,
        },
      },
    });

    if (!before) {
      throw new Error('Inventory baseline missing for stocked product.');
    }

    const http = await getHttp();
    const headers = await asAdmin();
    const quantity = 2;
    const price = Number(stockedProduct.price ?? 0) || 12.5;

    const response = await http
      .post('/api/v1/orders')
      .set(headers)
      .send({
        type: 'TAKEAWAY',
        sessionId: session.id,
        items: [
          {
            productId: stockedProduct.id,
            name: stockedProduct.nameEn,
            nameAr: stockedProduct.nameAr,
            price,
            quantity,
          },
        ],
      });

    expect(response.status).toBe(201);

    const after = await prisma.inventoryItem.findUnique({
      where: {
        productId_warehouseId: {
          productId: stockedProduct.id,
          warehouseId,
        },
      },
    });

    if (!after) {
      throw new Error('Inventory item missing after order creation.');
    }

    const beforeQty = new Prisma.Decimal(before.quantityOnHand).toNumber();
    const afterQty = new Prisma.Decimal(after.quantityOnHand).toNumber();
    expect(afterQty).toBeCloseTo(beforeQty - quantity, 3);

    const oversellQty = beforeQty + 1000;
    const oversell = await http
      .post('/api/v1/orders')
      .set(headers)
      .send({
        type: 'TAKEAWAY',
        sessionId: session.id,
        items: [
          {
            productId: stockedProduct.id,
            name: stockedProduct.nameEn,
            nameAr: stockedProduct.nameAr,
            price,
            quantity: oversellQty,
          },
        ],
      });

    expect(oversell.status).toBeGreaterThanOrEqual(400);
  });
});
