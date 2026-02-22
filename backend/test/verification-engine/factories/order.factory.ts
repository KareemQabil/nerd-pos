import { Prisma } from '@prisma/client';
import { asAdmin } from '../auth/auth-headers';
import { getHttp, getPrisma } from '../runtime/test-context';
import { getCoreRefs } from '../seed/core-refs-resolver';
import { faker } from './factory-context';

export type OrderResult = {
  id: string;
  orderNumber?: string;
  status?: string;
  grandTotal?: string | number;
  sessionId?: string;
};

const getStockedProduct = async (minimumQty: number) => {
  const refs = await getCoreRefs();
  const prisma = await getPrisma();

  for (const product of refs.products) {
    const item = await prisma.inventoryItem.findUnique({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: refs.warehouse.id,
        },
      },
    });

    if (!item) {
      continue;
    }

    const qty = new Prisma.Decimal(item.quantityOnHand).toNumber();
    if (qty >= minimumQty) {
      return { product, warehouseId: refs.warehouse.id };
    }
  }

  throw new Error('No stocked product found for verification order.');
};

export const createOrder = async (options: {
  type?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  sessionId?: string;
  itemsCount?: number;
}): Promise<OrderResult> => {
  const http = await getHttp();
  const headers = await asAdmin();
  const itemCount = options.itemsCount ?? 1;
  const { product } = await getStockedProduct(itemCount);

  const unitPrice = Number(product.price ?? 0) || 12.5;
  const items = Array.from({ length: itemCount }).map(() => ({
    productId: product.id,
    name: product.nameEn ?? 'Test Product',
    nameAr: product.nameAr ?? 'منتج تجريبي',
    price: unitPrice,
    quantity: 1,
    notes: faker.helpers.arrayElement([undefined, 'No onions', 'Extra spicy']),
  }));

  const response = await http
    .post('/api/v1/orders')
    .set(headers)
    .send({
      type: options.type ?? 'TAKEAWAY',
      sessionId: options.sessionId,
      items,
    });

  if (response.status !== 201) {
    throw new Error(
      `createOrder failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.result as OrderResult;
};

export const confirmOrder = async (orderId: string): Promise<OrderResult> => {
  const http = await getHttp();
  const headers = await asAdmin();

  const response = await http
    .put(`/api/v1/orders/${orderId}/confirm`)
    .set(headers)
    .send();

  if (response.status !== 200) {
    throw new Error(
      `confirmOrder failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.result as OrderResult;
};
