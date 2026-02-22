import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const DashboardShellPage = lazy(() => import('../../../pages/dashboard/dashboard-shell-page'));

export const Route = createFileRoute('/_protected/dashboard/')({
  component: () => (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <DashboardShellPage />
    </Suspense>
  ),
});
