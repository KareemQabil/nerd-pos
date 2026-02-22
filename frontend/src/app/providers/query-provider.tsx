import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { PersistedClient, Persister } from '@tanstack/query-persist-client-core';
import localforage from 'localforage';
import type { ReactNode } from 'react';
import { queryClient } from './query-client';

const STORAGE_KEY = 'rq-cache';

const persister: Persister = {
  persistClient: async (client: PersistedClient) => {
    await localforage.setItem(STORAGE_KEY, client);
  },
  restoreClient: async () => {
    return (await localforage.getItem<PersistedClient>(STORAGE_KEY)) ?? undefined;
  },
  removeClient: async () => {
    await localforage.removeItem(STORAGE_KEY);
  },
};

type QueryProviderProps = {
  children: ReactNode;
};

export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => query.meta?.persist === true,
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
