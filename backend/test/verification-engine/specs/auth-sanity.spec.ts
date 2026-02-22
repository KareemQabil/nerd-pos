import { asAdmin, asCashier } from '../auth/auth-headers';
import { getHttp } from '../runtime/test-context';

describe('verification auth sanity', () => {
  it('allows admin access to authenticated endpoint', async () => {
    const http = await getHttp();
    const headers = await asAdmin();

    const response = await http.get('/api/v1/auth/profile').set(headers);
    expect(response.status).toBe(200);
  });

  it('allows cashier access to authenticated endpoint', async () => {
    const http = await getHttp();
    const headers = await asCashier();

    const response = await http.get('/api/v1/auth/profile').set(headers);
    expect(response.status).toBe(200);
  });

  it('rejects invalid token', async () => {
    const http = await getHttp();
    const response = await http
      .get('/api/v1/auth/profile')
      .set({ Authorization: 'Bearer invalid.token' });
    expect(response.status).toBe(401);
  });
});
