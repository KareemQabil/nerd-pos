import { asAdmin } from '../auth/auth-headers';
import { getHttp } from '../runtime/test-context';
import { faker } from './factory-context';

export type SessionResult = {
  id: string;
  status?: string;
};

export const openSession = async (options?: {
  terminalId?: string;
  openingBalance?: number;
}): Promise<SessionResult> => {
  const http = await getHttp();
  const headers = await asAdmin();

  const response = await http
    .post('/api/v1/sessions/open')
    .set(headers)
    .send({
      terminalId: options?.terminalId ?? `TERM-${faker.string.alphanumeric(6)}`,
      openingBalance: options?.openingBalance ?? 200,
    });

  if (response.status !== 201) {
    throw new Error(
      `openSession failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.result as SessionResult;
};

export const closeSession = async (
  sessionId: string,
  options?: { denominations?: Array<{ value: number; count: number }> },
): Promise<SessionResult> => {
  const http = await getHttp();
  const headers = await asAdmin();
  const denominations =
    options?.denominations ??
    [
      { value: 100, count: 1 },
      { value: 50, count: 1 },
    ];

  const response = await http
    .post('/api/v1/sessions/close')
    .set(headers)
    .send({
      sessionId,
      denominations,
    });

  if (response.status !== 200) {
    throw new Error(
      `closeSession failed: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }

  return response.body.result as SessionResult;
};
