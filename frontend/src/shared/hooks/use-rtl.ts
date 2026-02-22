import { useEffect } from 'react';
import { useUiStore } from '../model/ui.store';

export function useRtl() {
  const locale = useUiStore((state) => state.locale);
  const isRtl = locale === 'ar';

  useEffect(() => {
    const root = document.documentElement;
    root.dir = isRtl ? 'rtl' : 'ltr';
  }, [isRtl]);

  return isRtl;
}
