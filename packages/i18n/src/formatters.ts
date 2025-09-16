/**
 * Locale-aware formatting utilities for dates and numbers
 */

export interface FormatOptions {
  locale?: string;
}

/**
 * Format a date according to the specified locale
 */
export const formatDate = (
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions & FormatOptions = {}
): string => {
  const { locale = 'en', ...dateOptions } = options;
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...dateOptions,
  }).format(dateObj);
};

/**
 * Format a date and time according to the specified locale
 */
export const formatDateTime = (
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions & FormatOptions = {}
): string => {
  const { locale = 'en', ...dateOptions } = options;
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...dateOptions,
  }).format(dateObj);
};

/**
 * Format a time according to the specified locale
 */
export const formatTime = (
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions & FormatOptions = {}
): string => {
  const { locale = 'en', ...dateOptions } = options;
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;

  return new Intl.DateTimeFormat(locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...dateOptions,
  }).format(dateObj);
};

/**
 * Format a number according to the specified locale
 */
export const formatNumber = (
  number: number,
  options: Intl.NumberFormatOptions & FormatOptions = {}
): string => {
  const { locale = 'en', ...numberOptions } = options;

  return new Intl.NumberFormat(locale, numberOptions).format(number);
};

/**
 * Format a currency amount according to the specified locale
 */
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  options: Intl.NumberFormatOptions & FormatOptions = {}
): string => {
  const { locale = 'en', ...numberOptions } = options;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...numberOptions,
  }).format(amount);
};

/**
 * Format a percentage according to the specified locale
 */
export const formatPercentage = (
  value: number,
  options: Intl.NumberFormatOptions & FormatOptions = {}
): string => {
  const { locale = 'en', ...numberOptions } = options;

  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...numberOptions,
  }).format(value);
};

/**
 * Format a relative time (e.g., "2 hours ago", "in 3 days")
 */
export const formatRelativeTime = (
  date: Date | string | number,
  options: FormatOptions = {}
): string => {
  const { locale = 'en' } = options;
  const dateObj =
    typeof date === 'string' || typeof date === 'number'
      ? new Date(date)
      : date;
  const now = new Date();
  const diffInSeconds = Math.floor((dateObj.getTime() - now.getTime()) / 1000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  const intervals = [
    { unit: 'year' as const, seconds: 31536000 },
    { unit: 'month' as const, seconds: 2592000 },
    { unit: 'day' as const, seconds: 86400 },
    { unit: 'hour' as const, seconds: 3600 },
    { unit: 'minute' as const, seconds: 60 },
    { unit: 'second' as const, seconds: 1 },
  ];

  for (const interval of intervals) {
    const count = Math.floor(Math.abs(diffInSeconds) / interval.seconds);
    if (count >= 1) {
      return rtf.format(diffInSeconds < 0 ? -count : count, interval.unit);
    }
  }

  return rtf.format(0, 'second');
};
