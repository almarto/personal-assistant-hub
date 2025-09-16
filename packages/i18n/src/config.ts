import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

// Import translation resources
import enTranslations from './locales/en/common.json';
import esTranslations from './locales/es/common.json';

const resources = {
  en: {
    common: enTranslations,
  },
  es: {
    common: esTranslations,
  },
};

const isDevelopment =
  (typeof window !== 'undefined' && (window as any).__DEV__) ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common'],

    // Language detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    // Development options
    debug: isDevelopment,

    // Backend options for lazy loading
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    // React options
    react: {
      useSuspense: false,
    },
  });

export { i18n };
