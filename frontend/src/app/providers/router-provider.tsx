import { RouterProvider as TanStackRouterProvider } from '@tanstack/react-router';
import { router } from '../router/router';
import { queryClient } from './query-client';

export function RouterProvider() {
  return (
    <TanStackRouterProvider router={router} context={{ queryClient }} />
  );
}
