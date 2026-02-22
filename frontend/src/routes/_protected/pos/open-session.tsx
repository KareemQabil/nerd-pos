import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const OpenSessionPage = lazy(() => import('../../../pages/pos/open-session-page'));

export const Route = createFileRoute('/_protected/pos/open-session')({
  component: () => (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <OpenSessionPage />
    </Suspense>
  ),
});
