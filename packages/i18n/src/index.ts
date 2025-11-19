// Main i18n configuration
import './config';

// Export hooks
export { useTranslation, useLocaleFormatters, useLanguage } from './hooks';

// Export formatters
export {
  formatDate,
  formatDateTime,
  formatTime,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatRelativeTime,
  type FormatOptions,
} from './formatters';

// Export i18n instance
export { i18n } from './config';

// Export types
export type SupportedLanguage = 'en' | 'es';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: LanguageConfig[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
];

// Default language
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// Language detection order
export const LANGUAGE_DETECTION_ORDER = [
  'localStorage',
  'navigator',
  'htmlTag',
] as const;

// Storage key for language preference
export const LANGUAGE_STORAGE_KEY = 'i18nextLng';
