import { QueryProvider } from '../providers/query-provider';
import { RouterProvider } from '../providers/router-provider';
import { ThemeProvider } from '../providers/theme-provider';
import { ErrorBoundary } from '../providers/error-boundary';
import { AuthBridge } from '../providers/auth-bridge';
import { AppInit } from '../../processes/app-init/app-init';
import { OfflineBanner } from '../../shared/ui/molecules/offline-banner';

export function AppRoot() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryProvider>
          <AppInit>
            <AuthBridge>
              <OfflineBanner />
              <RouterProvider />
            </AuthBridge>
          </AppInit>
        </QueryProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
