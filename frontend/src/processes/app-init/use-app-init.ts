import { useEffect } from 'react';
import { queryClient } from '../../app/providers/query-client';
import { prefetchPosBoot } from './pos-boot';
import { useOutbox } from '../offline-sync/use-outbox';

export function useAppInit() {
  useOutbox();

  useEffect(() => {
    prefetchPosBoot(queryClient).catch(() => {
      // ignore boot prefetch failures in foundation sprint
    });
  }, []);
}
