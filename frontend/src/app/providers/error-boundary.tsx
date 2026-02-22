import type { ReactNode } from 'react';
import { Component } from 'react';

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 text-start">
          <h1 className="text-xl font-semibold">Something went wrong.</h1>
          <p className="text-sm text-muted-foreground">Please refresh the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
