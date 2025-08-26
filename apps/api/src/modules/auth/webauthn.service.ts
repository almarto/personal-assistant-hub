import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passkeyCredentials } from '@personal-assistant-hub/database/dist/schema/index.js';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.module';

@Injectable()
export class WebAuthnService {
  private readonly rpName: string;
  private readonly rpID: string;
  private readonly origin: string;

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: any,
    private readonly configService: ConfigService
  ) {
    this.rpName =
      this.configService.get<string>('WEBAUTHN_RP_NAME') ||
      'Personal Assistant Hub';
    this.rpID = this.configService.get<string>('WEBAUTHN_RP_ID') || 'localhost';
    this.origin =
      this.configService.get<string>('WEBAUTHN_ORIGIN') ||
      'http://localhost:5173';
  }

  async generateRegistrationOptions(userID: string, email: string) {
    // Get existing credentials for this user
    const existingCredentials = await this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.userId, userID));

    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpID,
      userID: Buffer.from(userID, 'utf8'),
      userName: email,
      userDisplayName: email,
      timeout: 60000,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: ['internal', 'hybrid'],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    return options;
  }

  async verifyRegistrationResponse(
    userID: string,
    response: RegistrationResponseJSON,
    expectedChallenge: string
  ) {
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      requireUserVerification: false,
    });

    return verification;
  }

  async generateAuthenticationOptions(userID?: string) {
    let allowCredentials: any[] = [];

    if (userID) {
      // Get user's credentials
      const userCredentials = await this.db
        .select()
        .from(passkeyCredentials)
        .where(eq(passkeyCredentials.userId, userID));

      allowCredentials = userCredentials.map(cred => ({
        id: cred.credentialId,
        type: 'public-key',
        transports: ['internal', 'hybrid'],
      }));
    }

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      allowCredentials:
        allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'preferred',
      rpID: this.rpID,
    });

    return options;
  }

  async verifyAuthenticationResponse(
    response: AuthenticationResponseJSON,
    expectedChallenge: string,
    credentialID: string
  ) {
    // Get the credential from database
    const [credential] = await this.db
      .select()
      .from(passkeyCredentials)
      .where(eq(passkeyCredentials.credentialId, credentialID));

    if (!credential) {
      throw new Error('Credential not found');
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: this.origin,
      expectedRPID: this.rpID,
      credential: {
        id: credential.credentialId,
        publicKey: Buffer.from(credential.publicKey, 'base64'),
        counter: credential.counter,
        transports: ['internal', 'hybrid'],
      },
      requireUserVerification: false,
    });

    if (verification.verified) {
      // Update counter
      await this.db
        .update(passkeyCredentials)
        .set({
          counter: verification.authenticationInfo.newCounter,
          lastUsedAt: new Date(),
        })
        .where(eq(passkeyCredentials.credentialId, credentialID));
    }

    return { verification, userId: credential.userId };
  }
}
