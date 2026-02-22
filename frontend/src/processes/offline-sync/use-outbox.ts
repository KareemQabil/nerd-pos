import { useEffect } from 'react';
import { flush } from './outbox';

export function useOutbox() {
  useEffect(() => {
    const handleOnline = () => {
      flush().catch(() => undefined);
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);
}
