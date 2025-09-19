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
}

export interface PasskeyLoginCredentials {
  email: string;
}

export interface PasskeyCredential {
  id: string;
  deviceName: string;
  createdAt: Date;
}

export interface PasswordCredentials {
  email: string;
  password: string;
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
}

// Password-specific authentication service
export interface PasswordAuthService extends BaseAuthService {
  login(credentials: PasswordCredentials): Promise<AuthResult>;
  register(data: PasswordRegistrationData): Promise<AuthResult>;
  changePassword(oldPassword: string, newPassword: string): Promise<void>;
}

// Passkey-specific authentication service
export interface PasskeyAuthService extends BaseAuthService {
  login(credentials: PasskeyLoginCredentials): Promise<AuthResult>;
  register(data: PasskeyRegistrationData): Promise<AuthResult>;
  getAvailableCredentials(): Promise<PasskeyCredential[]>;
}

// Combined auth services interface
export interface AuthServiceI extends BaseAuthService {
  loginPasskey(credentials: PasskeyLoginCredentials): Promise<AuthResult>;
  registerPasskey(data: PasskeyRegistrationData): Promise<AuthResult>;
  loginPassword(credentials: PasswordCredentials): Promise<AuthResult>;
  registerPassword(data: PasswordRegistrationData): Promise<AuthResult>;
}

export interface AuthServiceConfig {
  apiBaseUrl: string;
}
