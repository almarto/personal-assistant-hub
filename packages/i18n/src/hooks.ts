import {
  useTranslation as useI18nTranslation,
  UseTranslationOptions,
} from 'react-i18next';

import {
  formatDate,
  formatDateTime,
  formatTime,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatRelativeTime,
} from './formatters';

export interface Language {
  code: string;
  name: string;
  flag: string;
  shortName: string;
}

/**
 * Custom hook for translations with enhanced functionality
 */
export const useTranslation = (
  ns?: string | string[],
  options?: UseTranslationOptions<any>
) => {
  const { t, i18n, ready } = useI18nTranslation(ns, options);

  return {
    t,
    i18n,
    ready,
    language: i18n.language,
    changeLanguage: i18n.changeLanguage,
  };
};

/**
 * Hook for locale-aware formatting
 */
export const useLocaleFormatters = () => {
  const { language } = useTranslation();

  return {
    formatDate: (
      date: Date | string | number,
      options?: Intl.DateTimeFormatOptions
    ) => formatDate(date, { ...options, locale: language }),
    formatDateTime: (
      date: Date | string | number,
      options?: Intl.DateTimeFormatOptions
    ) => formatDateTime(date, { ...options, locale: language }),
    formatTime: (
      date: Date | string | number,
      options?: Intl.DateTimeFormatOptions
    ) => formatTime(date, { ...options, locale: language }),
    formatNumber: (number: number, options?: Intl.NumberFormatOptions) =>
      formatNumber(number, { ...options, locale: language }),
    formatCurrency: (
      amount: number,
      currency?: string,
      options?: Intl.NumberFormatOptions
    ) => formatCurrency(amount, currency, { ...options, locale: language }),
    formatPercentage: (value: number, options?: Intl.NumberFormatOptions) =>
      formatPercentage(value, { ...options, locale: language }),
    formatRelativeTime: (date: Date | string | number) =>
      formatRelativeTime(date, { locale: language }),
  };
};

/**
 * Hook for language switching with persistence
 */
export const useLanguage = () => {
  const { language, changeLanguage, i18n } = useTranslation();

  const switchLanguage = async (lng: string) => {
    try {
      await changeLanguage(lng);
      // The language is automatically persisted by i18next-browser-languagedetector
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const availableLanguages: Language[] = [
    { code: 'en', name: 'English', flag: '🇺🇸', shortName: 'EN' },
    { code: 'es', name: 'Español', flag: '🇪🇸', shortName: 'ES' },
  ];

  return {
    currentLanguage: language,
    availableLanguages,
    switchLanguage,
    isReady: i18n.isInitialized,
  };
};
