import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { RouterContext } from '../app/router/route-context';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
});

function RootComponent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
