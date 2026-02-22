import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useSessionContextStore } from '../features/sessions/model/session-context.store';

export const Route = createFileRoute('/_protected')({
  beforeLoad: ({ location }) => {
    const session = useSessionContextStore.getState().activeSessionId;
    const goingToSession = location.pathname === '/pos/open-session';

    if (!session && location.pathname.startsWith('/pos') && !goingToSession) {
      throw redirect({ to: '/pos/open-session' });
    }
  },
  component: ProtectedLayout,
});

function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Outlet />
    </div>
  );
}
