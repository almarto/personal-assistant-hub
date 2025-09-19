import type { User } from '@/services/auth/types';

export interface UserSessionState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}
