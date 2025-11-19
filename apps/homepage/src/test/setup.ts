import '@testing-library/jest-dom';
import React from 'react';
import { vi } from 'vitest';

// Mock i18n translations
vi.mock('@personal-assistant-hub/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'tools.babyTracker.title': 'Baby Tracker',
        'tools.babyTracker.description':
          'Track feeding, sleeping, and development milestones for your little one.',
        'tools.gymTracker.title': 'Gym Tracker',
        'tools.gymTracker.description':
          'Monitor your workouts, progress, and fitness goals.',
        'tools.motoTracker.title': 'Moto Tracker',
        'tools.motoTracker.description':
          'Keep track of motorcycle maintenance, rides, and expenses.',
        'comingSoon.message':
          'This tool is currently under development and will be available soon.',
        'comingSoon.submessage': 'Check back later for updates!',
        'navigation.dashboard': 'Dashboard',
        'navigation.babyTracker': 'Baby Tracker',
        'navigation.gymTracker': 'Gym Tracker',
        'navigation.motoTracker': 'Moto Tracker',
        'homepage.yourTools': 'Your Tools',
        'homepage.welcome': 'Welcome to Personal Assistant Hub',
        'homepage.subtitle': 'Your personal productivity tools in one place',
      };
      return translations[key] || key;
    },
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
  useLanguage: () => ({
    currentLanguage: 'en',
    availableLanguages: [
      { code: 'en', name: 'English', flag: '🇺🇸', shortName: 'EN' },
      { code: 'es', name: 'Español', flag: '🇪🇸', shortName: 'ES' },
    ],
    switchLanguage: vi.fn(),
    isReady: true,
  }),
}));

// Mock auth module to prevent main.tsx execution
vi.mock('../main', () => ({
  auth: {
    useAuthStore: {
      getState: () => ({
        checkAuth: vi.fn().mockImplementation(() => {
          // Simulate immediate resolution
          return Promise.resolve();
        }),
        isAuthenticated: true, // Set to true to avoid auth redirects in tests
        user: { id: 'test-user', email: 'test@example.com' },
        login: vi.fn(),
        logout: vi.fn(),
      }),
      subscribe: vi.fn(),
    },
  },
}));

// Mock AuthGuard to avoid loading states but preserve Layout structure
vi.mock('../components/auth/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
}));

// Mock IntersectionObserver
Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  value: class IntersectionObserver {
    root = null;
    rootMargin = '';
    thresholds = [];
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() {
      return [];
    }
  },
});

// Mock ResizeObserver
Object.defineProperty(global, 'ResizeObserver', {
  writable: true,
  value: class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  },
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: () => {},
});

// Mock CSS modules
vi.mock('*.module.css', () => ({
  default: new Proxy(
    {},
    {
      get: (_, prop) => `mock-${String(prop)}`,
    }
  ),
}));

// Mock CSS imports
vi.mock('*.css', () => ({}));
