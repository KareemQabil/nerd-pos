import type { QueryClient } from '@tanstack/react-query';
import { catalogKeys, lookupKeys, settingsKeys } from '../../shared/api/query-keys';
import { stubCatalog, stubLookup, stubSettings } from '../../shared/api/stubs';

export async function prefetchPosBoot(client: QueryClient) {
  await Promise.all([
    client.prefetchQuery({
      queryKey: catalogKeys.products(),
      queryFn: stubCatalog,
      staleTime: 1000 * 60 * 30,
      meta: { persist: true },
    }),
    client.prefetchQuery({
      queryKey: catalogKeys.categories(),
      queryFn: stubCatalog,
      staleTime: 1000 * 60 * 30,
      meta: { persist: true },
    }),
    client.prefetchQuery({
      queryKey: catalogKeys.modifiers(),
      queryFn: stubCatalog,
      staleTime: 1000 * 60 * 30,
      meta: { persist: true },
    }),
    client.prefetchQuery({
      queryKey: lookupKeys.core(),
      queryFn: stubLookup,
      staleTime: 1000 * 60 * 60,
      meta: { persist: true },
    }),
    client.prefetchQuery({
      queryKey: settingsKeys.store(),
      queryFn: stubSettings,
      staleTime: 1000 * 60 * 60,
      meta: { persist: true },
    }),
  ]);
}
