import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  invitationTokens,
  passkeyCredentials,
  userSessions,
  users,
} from '@personal-assistant-hub/database/dist/schema/index.js';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

import { DATABASE_CONNECTION } from '../database/database.module';

import { WebAuthnService } from './webauthn.service';

@Injectable()
export class AuthService {
  private challengeStore = new Map<
    string,
    { challenge: string; userID?: string; email?: string }
  >();

  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: any,
    private readonly jwtService: JwtService,
    private readonly webAuthnService: WebAuthnService
  ) {}

  async initiateRegistration(email: string, invitationToken: string) {
    // Verify invitation token
    const [invitation] = await this.db
      .select()
      .from(invitationTokens)
      .where(
        and(
          eq(invitationTokens.token, invitationToken),
          eq(invitationTokens.email, email)
        )
      );

    if (!invitation) {
      throw new BadRequestException('Invalid invitation token');
    }

    if (invitation.usedAt) {
      throw new BadRequestException('Invitation token already used');
    }

    if (new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invitation token expired');
    }

    // Check if user already exists
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Generate temporary user ID for registration
    const tempUserID = uuidv4();
    const options = await this.webAuthnService.generateRegistrationOptions(
      tempUserID,
      email
    );

    // Store challenge
    const challengeKey = `reg_${email}_${invitationToken}`;
    this.challengeStore.set(challengeKey, {
      challenge: options.challenge,
      userID: tempUserID,
      email,
    });

    // Clean up old challenges (simple cleanup)
    setTimeout(
      () => {
        this.challengeStore.delete(challengeKey);
      },
      5 * 60 * 1000
    ); // 5 minutes

    return { options };
  }

  async completeRegistration(
    email: string,
    invitationToken: string,
    credential: RegistrationResponseJSON,
    deviceName?: string
  ) {
    const challengeKey = `reg_${email}_${invitationToken}`;
    const challengeData = this.challengeStore.get(challengeKey);

    if (!challengeData) {
      throw new BadRequestException(
        'Invalid or expired registration challenge'
      );
    }

    // Verify the credential
    const verification = await this.webAuthnService.verifyRegistrationResponse(
      challengeData.userID!,
      credential,
      challengeData.challenge
    );

    if (!verification.verified || !verification.registrationInfo) {
      throw new BadRequestException('Registration verification failed');
    }

    // Create user
    const [newUser] = await this.db
      .insert(users)
      .values({
        email,
        role: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Store credential
    await this.db.insert(passkeyCredentials).values({
      userId: newUser.id,
      credentialId: verification.registrationInfo.credential.id,
      publicKey: Buffer.from(
        verification.registrationInfo.credential.publicKey
      ).toString('base64'),
      counter: verification.registrationInfo.credential.counter,
      deviceName: deviceName || 'Unknown Device',
      createdAt: new Date(),
    });

    // Mark invitation as used
    await this.db
      .update(invitationTokens)
      .set({
        usedAt: new Date(),
        usedBy: newUser.id,
      })
      .where(eq(invitationTokens.token, invitationToken));

    // Clean up challenge
    this.challengeStore.delete(challengeKey);

    // Generate JWT token
    const payload = {
      sub: newUser.id,
      email: newUser.email,
      role: newUser.role,
    };
    const accessToken = this.jwtService.sign(payload);

    // Create session
    await this.createSession(newUser.id, accessToken);

    return {
      accessToken,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
        lastLoginAt: newUser.lastLoginAt,
      },
    };
  }

  async initiateLogin(email: string) {
    // Find user
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email));

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is disabled');
    }

    const options = await this.webAuthnService.generateAuthenticationOptions(
      user.id
    );

    // Store challenge
    const challengeKey = `auth_${email}`;
    this.challengeStore.set(challengeKey, {
      challenge: options.challenge,
      userID: user.id,
      email,
    });

    // Clean up old challenges
    setTimeout(
      () => {
        this.challengeStore.delete(challengeKey);
      },
      5 * 60 * 1000
    ); // 5 minutes

    return { options };
  }

  async completeLogin(email: string, credential: AuthenticationResponseJSON) {
    const challengeKey = `auth_${email}`;
    const challengeData = this.challengeStore.get(challengeKey);

    if (!challengeData) {
      throw new UnauthorizedException(
        'Invalid or expired authentication challenge'
      );
    }

    // Verify the credential
    const { verification, userId } =
      await this.webAuthnService.verifyAuthenticationResponse(
        credential,
        challengeData.challenge,
        credential.id
      );

    if (!verification.verified) {
      throw new UnauthorizedException('Authentication verification failed');
    }

    // Get user
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or disabled');
    }

    // Update last login
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Clean up challenge
    this.challengeStore.delete(challengeKey);

    // Generate JWT token
    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    // Create session
    await this.createSession(user.id, accessToken);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLoginAt: new Date(),
      },
    };
  }

  async logout(userId: string, sessionToken: string) {
    // Remove session
    await this.db
      .delete(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.sessionToken, sessionToken)
        )
      );

    return { message: 'Logged out successfully' };
  }

  async validateUser(userId: string): Promise<any> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, userId));

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async createSession(userId: string, sessionToken: string) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours

    await this.db.insert(userSessions).values({
      userId,
      sessionToken,
      expiresAt,
      createdAt: new Date(),
      lastAccessedAt: new Date(),
    });
  }
}
