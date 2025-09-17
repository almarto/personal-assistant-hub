import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

import type { AuthResult, PasskeyRegistrationData } from '../../types/auth';
import type { BaseAuthServiceConfig } from '../base-auth.service';
import { PasskeyAuthServiceImpl } from '../passkey-auth.service';

// Mock the @simplewebauthn/browser module
vi.mock('@simplewebauthn/browser', () => ({
  startRegistration: vi.fn(),
  startAuthentication: vi.fn(),
}));

const mockStartRegistration = vi.mocked(startRegistration);
const mockStartAuthentication = vi.mocked(startAuthentication);

// Mock fetch globally
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('PasskeyAuthServiceImpl', () => {
  let passkeyService: PasskeyAuthServiceImpl;
  const mockConfig: BaseAuthServiceConfig = {
    apiBaseUrl: 'http://localhost:3001',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    passkeyService = new PasskeyAuthServiceImpl(mockConfig);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('register', () => {
    it('should complete passkey registration successfully', async () => {
      const registrationData: PasskeyRegistrationData = {
        email: 'test@example.com',
        invitationToken: 'invitation-token',
        deviceName: 'Test Device',
      };

      const mockOptions = {
        challenge: 'challenge',
        user: {
          id: 'user-id',
          name: 'test@example.com',
          displayName: 'Test User',
        },
      };

      const mockCredential: RegistrationResponseJSON = {
        id: 'credential-id',
        rawId: 'credential-id',
        response: {
          clientDataJSON: 'client-data',
          attestationObject: 'attestation-object',
        },
        type: 'public-key',
        clientExtensionResults: {},
      };

      const mockAuthResult: AuthResult = {
        token: 'jwt-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: null,
          hasPassword: false,
          hasPasskeys: true,
        },
      };

      // Mock initiate registration call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: mockOptions }),
      } as Response);

      // Mock startRegistration
      mockStartRegistration.mockResolvedValueOnce(mockCredential);

      // Mock complete registration call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResult),
      } as Response);

      const result = await passkeyService.register(registrationData);

      // Should call initiate first
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:3001/auth/passkey/register/initiate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: registrationData.email,
            invitationToken: registrationData.invitationToken,
          }),
        })
      );

      // Should call startRegistration with options
      expect(mockStartRegistration).toHaveBeenCalledWith({
        optionsJSON: mockOptions,
      });

      // Should call complete registration
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:3001/auth/passkey/register/complete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: registrationData.email,
            invitationToken: registrationData.invitationToken,
            credential: mockCredential,
            deviceName: registrationData.deviceName,
          }),
        })
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_token',
        'jwt-token'
      );
      expect(result).toEqual(mockAuthResult);
    });

    it('should throw error when initiate registration fails', async () => {
      const registrationData: PasskeyRegistrationData = {
        email: 'test@example.com',
        invitationToken: 'invalid-token',
        deviceName: 'Test Device',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid invitation token' }),
      } as Response);

      await expect(passkeyService.register(registrationData)).rejects.toThrow(
        'Invalid invitation token'
      );
    });

    it('should throw error when user cancels registration', async () => {
      const registrationData: PasskeyRegistrationData = {
        email: 'test@example.com',
        invitationToken: 'invitation-token',
        deviceName: 'Test Device',
      };

      const mockOptions = { challenge: 'challenge' };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: mockOptions }),
      } as Response);

      mockStartRegistration.mockRejectedValueOnce(
        new Error('User cancelled registration')
      );

      await expect(passkeyService.register(registrationData)).rejects.toThrow(
        'User cancelled registration'
      );
    });
  });

  describe('login', () => {
    it('should authenticate user with passkey successfully', async () => {
      const email = 'test@example.com';

      const mockOptions = {
        challenge: 'challenge',
        allowCredentials: [],
      };

      const mockCredential: AuthenticationResponseJSON = {
        id: 'credential-id',
        rawId: 'credential-id',
        response: {
          clientDataJSON: 'client-data',
          authenticatorData: 'auth-data',
          signature: 'signature',
        },
        type: 'public-key',
        clientExtensionResults: {},
      };

      const mockAuthResult: AuthResult = {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          hasPassword: false,
          hasPasskeys: true,
        },
        token: 'jwt-token',
      };

      // Mock initiate login call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: mockOptions }),
      } as Response);

      // Mock startAuthentication
      mockStartAuthentication.mockResolvedValueOnce(mockCredential);

      // Mock complete login call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResult),
      } as Response);

      const result = await passkeyService.login({ email });

      // Should call initiate first
      expect(fetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:3001/auth/passkey/login/initiate',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ email }),
        })
      );

      // Should call startAuthentication with options
      expect(mockStartAuthentication).toHaveBeenCalledWith({
        optionsJSON: mockOptions,
      });

      // Should call complete login
      expect(fetch).toHaveBeenNthCalledWith(
        2,
        'http://localhost:3001/auth/passkey/login/complete',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email,
            credential: mockCredential,
          }),
        })
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_token',
        'jwt-token'
      );
      expect(result).toEqual(mockAuthResult);
    });

    it('should throw error when initiate login fails', async () => {
      const email = 'nonexistent@example.com';

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'User not found' }),
      } as Response);

      await expect(passkeyService.login({ email })).rejects.toThrow(
        'User not found'
      );
    });

    it('should throw error when user cancels authentication', async () => {
      const email = 'test@example.com';
      const mockOptions = { challenge: 'challenge' };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ options: mockOptions }),
      } as Response);

      mockStartAuthentication.mockRejectedValueOnce(
        new Error('User cancelled authentication')
      );

      await expect(passkeyService.login({ email })).rejects.toThrow(
        'User cancelled authentication'
      );
    });
  });

  describe('getPasskeys', () => {
    it('should fetch user passkeys when authenticated', async () => {
      const mockPasskeys = [
        {
          id: 'passkey-1',
          deviceName: 'iPhone',
          createdAt: new Date(),
          lastUsedAt: new Date(),
        },
        {
          id: 'passkey-2',
          deviceName: 'MacBook',
          createdAt: new Date(),
          lastUsedAt: null,
        },
      ];

      localStorageMock.getItem.mockReturnValue('valid-token');
      const authenticatedService = new PasskeyAuthServiceImpl(mockConfig);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ passkeys: mockPasskeys }),
      } as Response);

      const result = await authenticatedService.getPasskeys();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/passkey/list',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );

      expect(result).toEqual(mockPasskeys);
    });

    it('should throw error when not authenticated', async () => {
      await expect(passkeyService.getPasskeys()).rejects.toThrow();
    });
  });

  describe('deletePasskey', () => {
    it('should delete passkey successfully', async () => {
      const passkeyId = 'passkey-to-delete';

      localStorageMock.getItem.mockReturnValue('valid-token');
      const authenticatedService = new PasskeyAuthServiceImpl(mockConfig);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await authenticatedService.deletePasskey(passkeyId);

      expect(fetch).toHaveBeenCalledWith(
        `http://localhost:3001/auth/passkey/${passkeyId}`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            Authorization: 'Bearer valid-token',
          }),
        })
      );
    });

    it('should throw error when not authenticated', async () => {
      await expect(
        passkeyService.deletePasskey('passkey-id')
      ).rejects.toThrow();
    });
  });
});
