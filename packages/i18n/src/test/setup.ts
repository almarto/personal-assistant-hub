import { vi } from 'vitest';

// Mock i18next modules
vi.mock('i18next', () => ({
  default: {
    use: vi.fn().mockReturnThis(),
    init: vi.fn().mockResolvedValue(undefined),
    language: 'en',
    changeLanguage: vi.fn().mockResolvedValue(undefined),
    isInitialized: true,
    t: vi.fn((key: string) => key),
  },
}));

vi.mock('i18next-browser-languagedetector', () => ({
  default: vi.fn(),
}));

vi.mock('i18next-http-backend', () => ({
  default: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
  useTranslation: vi.fn(() => ({
    t: vi.fn((key: string) => key),
    i18n: {
      language: 'en',
      changeLanguage: vi.fn().mockResolvedValue(undefined),
      isInitialized: true,
    },
    ready: true,
  })),
}));

// Mock locale files
vi.mock('../locales/en/common.json', () => ({
  default: {
    common: {
      loading: 'Loading...',
      error: 'Error',
      success: 'Success',
    },
    navigation: {
      dashboard: 'Dashboard',
    },
  },
}));

vi.mock('../locales/es/common.json', () => ({
  default: {
    common: {
      loading: 'Cargando...',
      error: 'Error',
      success: 'Éxito',
    },
    navigation: {
      dashboard: 'Panel de Control',
    },
  },
}));

// Mock window and process for environment detection
Object.defineProperty(global, 'window', {
  value: {
    __DEV__: false,
  },
  writable: true,
});

Object.defineProperty(global, 'process', {
  value: {
    env: {
      NODE_ENV: 'test',
    },
  },
  writable: true,
});
