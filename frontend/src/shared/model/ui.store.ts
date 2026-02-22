import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemeName = 'dark' | 'light' | 'luxury';
export type Locale = 'ar' | 'en';

type UiState = {
  theme: ThemeName;
  locale: Locale;
  setTheme: (theme: ThemeName) => void;
  setLocale: (locale: Locale) => void;
};

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'dark',
      locale: 'ar',
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ theme: state.theme, locale: state.locale }),
    },
  ),
);
