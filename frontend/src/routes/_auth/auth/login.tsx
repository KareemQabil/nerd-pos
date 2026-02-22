import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense } from 'react';

const LoginPage = lazy(() => import('../../../pages/auth/login-page'));

export const Route = createFileRoute('/_auth/auth/login')({
  component: () => (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <LoginPage />
    </Suspense>
  ),
});
