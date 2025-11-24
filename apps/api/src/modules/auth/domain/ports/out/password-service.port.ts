export const PASSWORD_SERVICE = 'PASSWORD_SERVICE';

export interface PasswordService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  validatePasswordStrength(password: string): {
    isValid: boolean;
    errors: string[];
  };
}
