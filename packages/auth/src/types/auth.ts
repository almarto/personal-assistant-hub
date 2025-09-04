import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Date;
  lastLoginAt: Date | null;
}

export interface AuthResult {
  user: User;
  token: string;
}

export interface PasskeyCredentials {
  email: string;
  credential: AuthenticationResponseJSON;
}

export interface UserInfo {
  email: string;
  deviceName?: string;
}

export interface RegistrationData {
  email: string;
  invitationToken: string;
  credential: RegistrationResponseJSON;
  deviceName: string;
}

export interface AuthService {
  login(credentials: PasskeyCredentials): Promise<AuthResult>;
  logout(): Promise<void>;
  register(data: RegistrationData): Promise<AuthResult>;
  getCurrentUser(): Promise<User | null>;
  refreshToken(): Promise<string>;
  initiateRegistration(
    email: string,
    invitationToken: string
  ): Promise<PublicKeyCredentialCreationOptionsJSON>;
  initiateLogin(email: string): Promise<PublicKeyCredentialRequestOptionsJSON>;
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
