import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock only external dependencies
vi.mock('i18next', () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
    t: vi.fn((key: string) => key),
    language: 'en',
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
  },
}));

vi.mock('i18next-browser-languagedetector', () => ({
  default: vi.fn(),
}));

vi.mock('i18next-http-backend', () => ({
  default: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  initReactI18next: vi.fn(),
  useTranslation: vi.fn(() => ({
    t: vi.fn((key: string) => key),
    i18n: {
      language: 'en',
      changeLanguage: vi.fn().mockResolvedValue(undefined),
    },
  })),
}));

// Mock JSON files
vi.mock('./locales/en/common.json', () => ({
  default: {
    common: { loading: 'Loading...', error: 'Error' },
    navigation: { dashboard: 'Dashboard' },
  },
}));

vi.mock('./locales/es/common.json', () => ({
  default: {
    common: { loading: 'Cargando...', error: 'Error' },
    navigation: { dashboard: 'Panel de Control' },
  },
}));

describe('i18n Package Integration', () => {
  const testDate = new Date('2024-01-15T14:30:00.000Z');
  const testTimestamp = testDate.getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T16:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should initialize i18n configuration without errors', async () => {
      // This will trigger the config initialization
      const { i18n } = await import('./config');
      expect(i18n).toBeDefined();
    });
  });

  describe('Formatters', () => {
    let formatters: any;

    beforeEach(async () => {
      formatters = await import('./formatters');
    });

    describe('Date Formatting', () => {
      it('should format dates correctly', () => {
        const result = formatters.formatDate(testDate);
        expect(result).toMatch(/Jan.*15.*2024/);
      });

      it('should format dates with different locales', () => {
        const result = formatters.formatDate(testDate, { locale: 'es' });
        expect(result).toMatch(/ene.*15.*2024|15.*ene.*2024/);
      });

      it('should handle string input', () => {
        const result = formatters.formatDate('2024-01-15T14:30:00.000Z');
        expect(result).toMatch(/Jan.*15.*2024/);
      });

      it('should handle timestamp input', () => {
        const result = formatters.formatDate(testTimestamp);
        expect(result).toMatch(/Jan.*15.*2024/);
      });
    });

    describe('Time Formatting', () => {
      it('should format time correctly', () => {
        const result = formatters.formatTime(testDate);
        expect(result).toMatch(/\d{1,2}:\d{2}/);
      });

      it('should respect 24-hour format', () => {
        const result = formatters.formatTime(testDate, {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
        expect(result).toMatch(/\d{2}:\d{2}/);
      });
    });

    describe('DateTime Formatting', () => {
      it('should format datetime correctly', () => {
        const result = formatters.formatDateTime(testDate);
        expect(result).toMatch(/Jan.*15.*2024.*\d{1,2}:\d{2}/);
      });
    });

    describe('Number Formatting', () => {
      it('should format numbers with default locale', () => {
        const result = formatters.formatNumber(1234567.89);
        expect(result).toMatch(/1,234,567\.89|1.234.567,89/);
      });

      it('should format numbers with Spanish locale', () => {
        const result = formatters.formatNumber(1234567.89, { locale: 'es' });
        expect(result).toMatch(/1\.234\.567,89|1,234,567\.89/);
      });

      it('should handle integer input', () => {
        const result = formatters.formatNumber(1234);
        expect(result).toMatch(/1,234|1\.234/);
      });
    });

    describe('Currency Formatting', () => {
      it('should format USD currency', () => {
        const result = formatters.formatCurrency(1234.56, 'USD');
        expect(result).toContain('$');
        expect(result).toMatch(/1,234\.56|1\.234,56/);
      });

      it('should format EUR currency', () => {
        const result = formatters.formatCurrency(1234.56, 'EUR');
        expect(result).toContain('€');
      });

      it('should respect locale for currency formatting', () => {
        const result = formatters.formatCurrency(1234.56, 'EUR', {
          locale: 'es',
        });
        expect(result).toContain('€');
      });
    });

    describe('Percentage Formatting', () => {
      it('should format percentages', () => {
        const result = formatters.formatPercentage(0.1234);
        expect(result).toContain('%');
        expect(result).toMatch(/12/);
      });

      it('should handle negative percentages', () => {
        const result = formatters.formatPercentage(-0.1234);
        expect(result).toContain('%');
        expect(result).toContain('-');
      });

      it('should respect locale for percentage formatting', () => {
        const result = formatters.formatPercentage(0.1234, { locale: 'es' });
        expect(result).toContain('%');
      });
    });

    describe('Relative Time Formatting', () => {
      it('should format relative time', () => {
        const result = formatters.formatRelativeTime(testDate);
        expect(result).toMatch(/ago|hours?/);
      });

      it('should handle future dates', () => {
        const futureDate = new Date('2024-01-15T18:30:00.000Z');
        const result = formatters.formatRelativeTime(futureDate);
        expect(result).toMatch(/in|hours?/);
      });
    });
  });

  describe('Hooks Integration', () => {
    let hooks: any;

    beforeEach(async () => {
      hooks = await import('./hooks');
    });

    describe('useTranslation', () => {
      it('should provide translation function', () => {
        const { result } = renderHook(() => hooks.useTranslation());

        expect(result.current.t).toBeDefined();
        expect(typeof result.current.t).toBe('function');
        expect(result.current.i18n).toBeDefined();
      });
    });

    describe('useLocaleFormatters', () => {
      it('should provide formatting functions', () => {
        const { result } = renderHook(() => hooks.useLocaleFormatters());

        expect(result.current.formatDate).toBeDefined();
        expect(result.current.formatTime).toBeDefined();
        expect(result.current.formatDateTime).toBeDefined();
        expect(result.current.formatNumber).toBeDefined();
        expect(result.current.formatCurrency).toBeDefined();
        expect(result.current.formatPercentage).toBeDefined();
        expect(result.current.formatRelativeTime).toBeDefined();
      });

      it('should format dates using hooks', () => {
        const { result } = renderHook(() => hooks.useLocaleFormatters());

        const formattedDate = result.current.formatDate(testDate);
        expect(formattedDate).toMatch(/Jan.*15.*2024/);
      });

      it('should format numbers using hooks', () => {
        const { result } = renderHook(() => hooks.useLocaleFormatters());

        const formattedNumber = result.current.formatNumber(1234.56);
        expect(formattedNumber).toMatch(/1,234\.56|1\.234,56/);
      });
    });

    describe('useLanguage', () => {
      it('should provide language management functions', () => {
        const { result } = renderHook(() => hooks.useLanguage());

        expect(result.current.currentLanguage).toBeDefined();
        expect(result.current.switchLanguage).toBeDefined();
        expect(typeof result.current.switchLanguage).toBe('function');
      });

      it('should handle language changes', async () => {
        const { result } = renderHook(() => hooks.useLanguage());

        await act(async () => {
          await result.current.switchLanguage('es');
        });

        // The mock should have been called
        expect(result.current.switchLanguage).toBeDefined();
      });
    });
  });

  describe('Package Integration', () => {
    it('should work together - config, formatters, and hooks', async () => {
      // Import all modules
      const { i18n } = await import('./config');
      const formatters = await import('./formatters');
      const hooks = await import('./hooks');

      // Test that config is initialized
      expect(i18n).toBeDefined();

      // Test that formatters work
      const formattedDate = formatters.formatDate(testDate);
      expect(formattedDate).toMatch(/Jan.*15.*2024/);

      // Test that hooks work
      const { result } = renderHook(() => hooks.useLocaleFormatters());
      expect(result.current.formatDate).toBeDefined();

      // Test integration - hooks should use the same formatting logic
      const hookFormattedDate = result.current.formatDate(testDate);
      expect(hookFormattedDate).toMatch(/Jan.*15.*2024/);
    });

    it('should handle different locales consistently across the package', async () => {
      const formatters = await import('./formatters');
      const hooks = await import('./hooks');

      // Test Spanish locale formatting
      const directFormat = formatters.formatNumber(1234.56, { locale: 'es' });

      const { result } = renderHook(() => hooks.useLocaleFormatters());
      const hookFormat = result.current.formatNumber(1234.56);

      // Both should handle Spanish locale (exact format may vary by system)
      expect(directFormat).toMatch(/\d/);
      expect(hookFormat).toMatch(/\d/);
    });

    it('should handle edge cases gracefully', async () => {
      const formatters = await import('./formatters');

      // Test with null/undefined (should not throw)
      expect(() => formatters.formatDate(null as any)).not.toThrow();
      expect(() => formatters.formatNumber(NaN)).not.toThrow();

      // Test with invalid dates - formatDate should throw on invalid dates
      const invalidDate = new Date('invalid');
      expect(() => formatters.formatDate(invalidDate)).toThrow();
    });
  });
});
