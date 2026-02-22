import localforage from 'localforage';

export type OutboxOp = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: string;
  retryCount: number;
  lastError?: string;
};

const STORAGE_KEY = 'offline-outbox';

export async function enqueue(op: OutboxOp) {
  const current = await listPending();
  await localforage.setItem(STORAGE_KEY, [...current, op]);
}

export async function listPending(): Promise<OutboxOp[]> {
  return (await localforage.getItem<OutboxOp[]>(STORAGE_KEY)) ?? [];
}

export async function flush() {
  // TODO: wire to mutation layer once APIs exist.
  const pending = await listPending();
  if (pending.length === 0) return;

  await localforage.setItem(STORAGE_KEY, pending);
}
