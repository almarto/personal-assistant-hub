export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLoginAt: Date | null;
  hasPassword: boolean;
  hasPasskeys: boolean;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface PasskeyCredentials {
  email: string;
}

export interface PasswordCredentials {
  email: string;
  password: string;
}

export interface UserInfo {
  email: string;
  deviceName?: string;
}

export interface PasskeyRegistrationData {
  email: string;
  invitationToken: string;
  deviceName: string;
}

export interface PasswordRegistrationData {
  email: string;
  password: string;
  invitationToken: string;
}

// Base interface for common authentication functionality
export interface BaseAuthService {
  login(
    credentials: PasswordCredentials | PasskeyCredentials
  ): Promise<AuthResult>;
  logout(): Promise<void>;
  register(
    data: PasswordRegistrationData | PasskeyRegistrationData
  ): Promise<AuthResult>;
  getCurrentUser(): Promise<User | null>;
  refreshToken(): Promise<string>;
  getToken(): string | null;
  isAuthenticated(): boolean;
}

// Password-specific authentication service
export interface PasswordAuthService extends BaseAuthService {
  login(credentials: PasswordCredentials): Promise<AuthResult>;
  register(data: PasswordRegistrationData): Promise<AuthResult>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
}

// Passkey-specific authentication service
export interface PasskeyAuthService extends BaseAuthService {
  login(credentials: PasskeyCredentials): Promise<AuthResult>;
  register(data: PasskeyRegistrationData): Promise<AuthResult>;
  getAvailableCredentials(): Promise<PasskeyCredential[]>;
}

export interface PasskeyCredential {
  id: string;
  deviceName: string;
  createdAt: Date;
}

// Combined auth services interface
export interface AuthServices {
  passwordService: PasswordAuthService;
  passkeyService: PasskeyAuthService;
  getCurrentUser(): Promise<User | null>;
  logout(): Promise<void>;
}

// Legacy interface for backward compatibility
export interface AuthService {
  login(email: string): Promise<AuthResult>;
  logout(): Promise<void>;
  register(data: PasskeyRegistrationData): Promise<AuthResult>;
  getCurrentUser(): Promise<User | null>;
  refreshToken(): Promise<string>;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  login: (email: string) => Promise<void>;
  register: (
    email: string,
    invitationToken: string,
    deviceName: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;
