import { createRouter } from '@tanstack/react-router';
import { routeTree } from '../../routeTree.gen';
import type { RouterContext } from './route-context';
import { queryClient } from '../providers/query-client';

export const router = createRouter({
  routeTree,
  context: { queryClient } as RouterContext,
  defaultPreload: 'intent',
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
