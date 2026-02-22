import { asAdmin } from '../auth/auth-headers';
import { getPrisma, getHttp } from '../runtime/test-context';
import { truncateTransactional } from '../db/truncate';
import { getCoreRefs } from '../seed/core-refs-resolver';

const unwrapResult = (body: any) => body?.result ?? body?.data ?? body;

describe('verification truncate safety', () => {
  it('preserves seeded static data after truncate', async () => {
    const prisma = await getPrisma();
    const refs = await getCoreRefs();
    const http = await getHttp();
    const headers = await asAdmin();

    const beforeResponse = await http
      .get('/api/v1/lookup/products')
      .set(headers)
      .query({ limit: 50 });
    expect(beforeResponse.status).toBe(200);
    const beforeList = unwrapResult(beforeResponse.body) as Array<{ id: string }>;
    expect(beforeList.some((item) => item.id === refs.products[0].id)).toBe(
      true,
    );

    await truncateTransactional(prisma);

    const afterResponse = await http
      .get('/api/v1/lookup/products')
      .set(headers)
      .query({ limit: 50 });
    expect(afterResponse.status).toBe(200);
    const afterList = unwrapResult(afterResponse.body) as Array<{ id: string }>;
    expect(afterList.some((item) => item.id === refs.products[0].id)).toBe(
      true,
    );
  });
});
