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
}

export interface UserInfo {
  email: string;
  deviceName?: string;
}

export interface RegistrationData {
  email: string;
  invitationToken: string;
  deviceName: string;
}

export interface AuthService {
  login(email: string): Promise<AuthResult>;
  logout(): Promise<void>;
  register(data: RegistrationData): Promise<AuthResult>;
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
