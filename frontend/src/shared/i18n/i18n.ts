import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { resources } from './resources';

let initialized = false;

export function initI18n(language: 'ar' | 'en') {
  if (initialized) {
    i18n.changeLanguage(language);
    return i18n;
  }

  i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

  initialized = true;
  return i18n;
}

export { i18n };
