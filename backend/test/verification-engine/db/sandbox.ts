import { getPrisma } from '../runtime/test-context';
import { truncateTransactional } from './truncate';

export const resetTransactionalState = async (): Promise<void> => {
  const prisma = await getPrisma();
  await truncateTransactional(prisma);
};
