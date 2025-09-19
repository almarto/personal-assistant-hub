import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

import type {
  AuthResult,
  PasswordCredentials,
  PasswordRegistrationData,
} from '../../types/auth';
import type { AuthServiceConfig } from '../base-auth.service';
import { PasswordAuthServiceImpl } from '../password-auth.service';

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

describe('PasswordAuthServiceImpl', () => {
  let passwordService: PasswordAuthServiceImpl;
  const mockConfig: AuthServiceConfig = {
    apiBaseUrl: 'http://localhost:3001',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    passwordService = new PasswordAuthServiceImpl(mockConfig);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const credentials: PasswordCredentials = {
        email: 'test@example.com',
        password: 'password123',
      };

      const mockAuthResult: AuthResult = {
        token: 'jwt-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          hasPassword: true,
          hasPasskeys: false,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResult),
      } as Response);

      const result = await passwordService.login(credentials);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/login/password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
          }),
        })
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_token',
        'jwt-token'
      );
      expect(result).toEqual(mockAuthResult);
    });

    it('should throw error when login fails', async () => {
      const credentials: PasswordCredentials = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Invalid credentials' }),
      } as Response);

      await expect(passwordService.login(credentials)).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('register', () => {
    it('should register successfully with valid data', async () => {
      const registrationData: PasswordRegistrationData = {
        email: 'test@example.com',
        password: 'password123',
        invitationToken: 'invitation-token',
      };

      const mockAuthResult: AuthResult = {
        token: 'jwt-token',
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: 'user',
          createdAt: new Date(),
          lastLoginAt: null,
          hasPassword: true,
          hasPasskeys: false,
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAuthResult),
      } as Response);

      const result = await passwordService.register(registrationData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/register/password',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            email: registrationData.email,
            password: registrationData.password,
            invitationToken: registrationData.invitationToken,
          }),
        })
      );

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_token',
        'jwt-token'
      );
      expect(result).toEqual(mockAuthResult);
    });

    it('should throw error when registration fails', async () => {
      const registrationData: PasswordRegistrationData = {
        email: 'test@example.com',
        password: 'password123',
        invitationToken: 'invalid-token',
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Invalid invitation token' }),
      } as Response);

      await expect(passwordService.register(registrationData)).rejects.toThrow(
        'Invalid invitation token'
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const oldPassword = 'oldpassword';
      const newPassword = 'newpassword';

      // Set up authenticated state
      localStorageMock.getItem.mockReturnValue('valid-token');
      const authenticatedService = new PasswordAuthServiceImpl(mockConfig);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await authenticatedService.changePassword(oldPassword, newPassword);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/password/change',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer valid-token',
          }),
          body: JSON.stringify({
            oldPassword,
            newPassword,
          }),
        })
      );
    });

    it('should throw error when change password fails', async () => {
      localStorageMock.getItem.mockReturnValue('valid-token');
      const authenticatedService = new PasswordAuthServiceImpl(mockConfig);

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () =>
          Promise.resolve({ message: 'Current password is incorrect' }),
      } as Response);

      await expect(
        authenticatedService.changePassword('wrongpassword', 'newpassword')
      ).rejects.toThrow('Current password is incorrect');
    });
  });

  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const strongPassword = 'StrongP@ssw0rd';
      const result =
        PasswordAuthServiceImpl.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password that is too short', () => {
      const shortPassword = 'Short1!';
      const result =
        PasswordAuthServiceImpl.validatePasswordStrength(shortPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must be at least 8 characters long'
      );
    });

    it('should reject password without uppercase letter', () => {
      const password = 'lowercase123!';
      const result = PasswordAuthServiceImpl.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one uppercase letter'
      );
    });

    it('should reject password without lowercase letter', () => {
      const password = 'UPPERCASE123!';
      const result = PasswordAuthServiceImpl.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one lowercase letter'
      );
    });

    it('should reject password without number', () => {
      const password = 'NoNumbers!';
      const result = PasswordAuthServiceImpl.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one number'
      );
    });

    it('should reject password without special character', () => {
      const password = 'NoSpecialChar123';
      const result = PasswordAuthServiceImpl.validatePasswordStrength(password);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Password must contain at least one special character'
      );
    });

    it('should return multiple errors for weak password', () => {
      const weakPassword = 'weak';
      const result =
        PasswordAuthServiceImpl.validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4); // Missing: length, uppercase, number, special char
    });
  });
});
