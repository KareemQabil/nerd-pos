import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const KdsPage = lazy(() => import('../../../pages/kitchen/kds-page'));

export const Route = createFileRoute('/_protected/kitchen/')({
  component: () => (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <KdsPage />
    </Suspense>
  ),
});
