import { PasskeyCredential } from '../../model/passkey-credential.model';

export const PASSKEY_CREDENTIAL_REPOSITORY = 'PASSKEY_CREDENTIAL_REPOSITORY';

export interface PasskeyCredentialRepository {
  create(data: {
    id: string;
    userId: string;
    credentialId: string;
    publicKey: string;
    counter: number;
    deviceName: string;
  }): Promise<void>;
  findByUserId(userId: string): Promise<PasskeyCredential[]>;
  findByCredentialId(credentialId: string): Promise<PasskeyCredential | null>;
  updateCounter(credentialId: string, newCounter: number): Promise<void>;
}
