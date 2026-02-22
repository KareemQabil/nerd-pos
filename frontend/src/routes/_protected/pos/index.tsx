import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const PosShellPage = lazy(() => import('../../../pages/pos/pos-shell-page'));

export const Route = createFileRoute('/_protected/pos/')({
  component: () => (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <PosShellPage />
    </Suspense>
  ),
});
