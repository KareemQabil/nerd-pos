import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { config as loadEnv } from 'dotenv';

const loadEnvFiles = (): void => {
  loadEnv({ path: '.env.local' });
  loadEnv({ path: '.env' });
};

const formatPowerShellEnv = (key: string, value?: string): string | null => {
  if (!value) return null;
  return `$env:${key}="${value}"`;
};

const main = async (): Promise<void> => {
  loadEnvFiles();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to resolve test ids.');
  }

  const accelerateUrl = process.env.PRISMA_DATABASE_URL;
  let prisma: PrismaClient;

  if (
    process.env.PRISMA_USE_ACCELERATE === 'true' &&
    accelerateUrl &&
    accelerateUrl.startsWith('prisma+postgres://')
  ) {
    prisma = new PrismaClient({ accelerateUrl });
  } else {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required to resolve test ids.');
    }

    const requiresSsl =
      connectionString.includes('sslmode=require') ||
      connectionString.includes('db.prisma.io');

    const pool = new Pool({
      connectionString,
      ssl: requiresSsl ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
  }

  try {
    let warehouseId: string | undefined;
    let productIds: string[] = [];
    let categoryId: string | undefined;

    const defaultWarehouse = await prisma.warehouse.findFirst({
      where: { isDefault: true, isActive: true },
      select: { id: true },
    });
    warehouseId = defaultWarehouse?.id;

    const inventoryItems = await prisma.inventoryItem.findMany({
      where: { quantityOnHand: { gt: 0 } },
      include: { product: true },
      orderBy: { quantityOnHand: 'desc' },
      take: 3,
    });

    if (inventoryItems.length) {
      productIds = inventoryItems.map((item) => item.productId);
      categoryId = inventoryItems[0]?.product?.categoryId;
      warehouseId = warehouseId ?? inventoryItems[0]?.warehouseId;
    } else {
      const products = await prisma.product.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        take: 3,
      });
      productIds = products.map((product) => product.id);
      categoryId = products[0]?.categoryId;
    }

    if (!warehouseId || productIds.length === 0) {
      throw new Error(
        'Unable to resolve warehouse/products from the database. Provide TEST_WAREHOUSE_ID and TEST_PRODUCT_IDS manually.',
      );
    }

    const envLines = [
      formatPowerShellEnv('TEST_WAREHOUSE_ID', warehouseId),
      formatPowerShellEnv('TEST_PRODUCT_IDS', productIds.join(',')),
      formatPowerShellEnv('TEST_CATEGORY_ID', categoryId),
    ].filter(Boolean);

    console.log('Resolved verification IDs. Set these in PowerShell:');
    for (const line of envLines) {
      console.log(line);
    }
  } finally {
    await prisma.$disconnect();
  }
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[resolve-test-ids] failed', error);
  process.exit(1);
});
