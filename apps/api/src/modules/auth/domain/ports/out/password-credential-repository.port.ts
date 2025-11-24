import { PasswordCredential } from '../../model/password-credential.model';

export const PASSWORD_CREDENTIAL_REPOSITORY = 'PASSWORD_CREDENTIAL_REPOSITORY';

export interface PasswordCredentialRepository {
  create(data: {
    id: string;
    userId: string;
    passwordHash: string;
  }): Promise<void>;
  findByUserId(userId: string): Promise<PasswordCredential | null>;
  updateByUserId(userId: string, data: { passwordHash: string }): Promise<void>;
}
