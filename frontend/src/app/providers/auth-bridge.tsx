import type { ReactNode } from 'react';

type AuthBridgeProps = {
  children: ReactNode;
};

export function AuthBridge({ children }: AuthBridgeProps) {
  return children;
}
