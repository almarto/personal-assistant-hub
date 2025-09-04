import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock localStorage
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Comprehensive React DOM polyfills
if (typeof window !== 'undefined') {
  // Mock navigator properties that React DOM needs
  Object.defineProperty(window.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (Node.js) jsdom/test',
    writable: true,
    configurable: true,
  });

  // Add missing DOM APIs
  if (!window.matchMedia) {
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }

  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  }

  // React DOM client environment setup
  (
    global as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;

  // Mock React DOM createRoot to avoid client-side issues
  if (typeof document !== 'undefined') {
    const mockCreateRoot = vi.fn(() => ({
      render: vi.fn(),
      unmount: vi.fn(),
    }));

    // Ensure React DOM client doesn't fail
    vi.doMock('react-dom/client', () => ({
      createRoot: mockCreateRoot,
    }));
  }
}

// Mock fetch
global.fetch = vi.fn();

// Mock WebAuthn APIs
Object.defineProperty(window, 'navigator', {
  value: {
    credentials: {
      create: vi.fn(),
      get: vi.fn(),
    },
  },
  writable: true,
});

// Mock PublicKeyCredential
Object.defineProperty(window, 'PublicKeyCredential', {
  value: {
    isUserVerifyingPlatformAuthenticatorAvailable: vi
      .fn()
      .mockResolvedValue(true),
    isConditionalMediationAvailable: vi.fn().mockResolvedValue(true),
  },
  writable: true,
});
