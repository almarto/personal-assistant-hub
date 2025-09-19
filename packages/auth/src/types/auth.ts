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
  logout(): Promise<void>;
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

// Combined auth services interface
export interface AuthServiceI extends BaseAuthService {
  passwordService: PasswordAuthService;
  passkeyService: PasskeyAuthService;
}

export interface PasskeyCredential {
  id: string;
  deviceName: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AuthActions {
  //hydrateFromToken: () => Promise<void>;
  setAuthState: (
    user: User | null,
    isAuthenticated: boolean,
    isLoading: boolean,
    error: string | null
  ) => void;
  clearError: () => void;
}

export type AuthStore = AuthState & AuthActions;
