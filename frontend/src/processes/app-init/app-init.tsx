import type { ReactNode } from 'react';
import { useAppInit } from './use-app-init';

type AppInitProps = {
  children: ReactNode;
};

export function AppInit({ children }: AppInitProps) {
  useAppInit();
  return children;
}
