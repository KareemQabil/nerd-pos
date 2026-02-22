import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useUiStore } from '../../shared/model/ui.store';
import { initI18n } from '../../shared/i18n';
import { useRtl } from '../../shared/hooks/use-rtl';

type ThemeProviderProps = {
  children: ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
  const theme = useUiStore((state) => state.theme);
  const locale = useUiStore((state) => state.locale);

  useRtl();

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.lang = locale;
    initI18n(locale);
  }, [theme, locale]);

  return children;
}
