import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';

export const WEBAUTHN_SERVICE = 'WEBAUTHN_SERVICE';

export interface WebAuthnService {
  generateRegistrationOptions(
    userID: string,
    email: string
  ): Promise<PublicKeyCredentialCreationOptionsJSON>;

  verifyRegistrationResponse(
    credential: RegistrationResponseJSON,
    expectedChallenge: string
  ): Promise<{
    verified: boolean;
    credentialId: string;
    publicKey: string;
  }>;

  generateAuthenticationOptions(
    userID: string,
    credentials: Array<{ credentialId: string; publicKey: string }>
  ): Promise<PublicKeyCredentialRequestOptionsJSON>;

  verifyAuthenticationResponse(
    credential: AuthenticationResponseJSON,
    expectedChallenge: string,
    storedCredential: {
      credentialId: string;
      publicKey: string;
      counter: number;
    }
  ): Promise<{
    verified: boolean;
    newCounter: number;
  }>;
}
