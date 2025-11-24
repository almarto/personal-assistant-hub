import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateAuthenticationOptions as generateAuthOptions,
  generateRegistrationOptions as generateRegOptions,
  verifyAuthenticationResponse as verifyAuthResponse,
  verifyRegistrationResponse as verifyRegResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';

import { WebAuthnService } from '../../../domain/ports/out/webauthn-service.port';

@Injectable()
export class WebAuthnServiceAdapter implements WebAuthnService {
  private readonly rpName: string;
  private readonly rpID: string;
  private readonly origin: string;

  constructor(private readonly configService: ConfigService) {
    this.rpName =
      this.configService.get<string>('WEBAUTHN_RP_NAME') ||
      'Personal Assistant Hub';
    this.rpID = this.configService.get<string>('WEBAUTHN_RP_ID') || 'localhost';
    this.origin =
      this.configService.get<string>('WEBAUTHN_ORIGIN') ||
      'http://localhost:3000';
  }

  async generateRegistrationOptions(userID: string, email: string) {
    return await generateRegOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Buffer.from(userID),
      userName: email,
      userDisplayName: email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });
  }

  async verifyRegistrationResponse(
    credential: RegistrationResponseJSON,
    expectedChallenge: string
  ) {
    const verification = await verifyRegResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return {
        verified: false,
        credentialId: '',
        publicKey: '',
      };
    }

    return {
      verified: true,
      credentialId: Buffer.from(
        verification.registrationInfo.credential.id
      ).toString('base64'),
      publicKey: Buffer.from(
        verification.registrationInfo.credential.publicKey
      ).toString('base64'),
    };
  }

  async generateAuthenticationOptions(
    userID: string,
    credentials: Array<{ credentialId: string; publicKey: string }>
  ) {
    return await generateAuthOptions({
      rpID: this.rpID,
      allowCredentials: credentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key' as const,
      })),
      userVerification: 'preferred',
    });
  }

  async verifyAuthenticationResponse(
    credential: AuthenticationResponseJSON,
    expectedChallenge: string,
    storedCredential: {
      credentialId: string;
      publicKey: string;
      counter: number;
    }
  ) {
    const verification = await verifyAuthResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      credential: {
        id: storedCredential.credentialId,
        publicKey: Buffer.from(storedCredential.publicKey, 'base64'),
        counter: storedCredential.counter,
      },
    });

    return {
      verified: verification.verified,
      newCounter: verification.authenticationInfo?.newCounter || 0,
    };
  }
}
