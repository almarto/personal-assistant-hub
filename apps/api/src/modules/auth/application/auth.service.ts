import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/types';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../domain/model/user.model';
import { AuthUseCase } from '../domain/ports/in/auth-use-case.port';
import { InvitationRepository } from '../domain/ports/out/invitation-repository.port';
import { JwtService } from '../domain/ports/out/jwt-service.port';
import { PasskeyCredentialRepository } from '../domain/ports/out/passkey-credential-repository.port';
import { SessionRepository } from '../domain/ports/out/session-repository.port';
import { UserRepository } from '../domain/ports/out/user-repository.port';
import { WebAuthnService } from '../domain/ports/out/webauthn-service.port';

@Injectable()
export class AuthService implements AuthUseCase {
  private challengeStore = new Map<
    string,
    { challenge: string; userID?: string; email?: string }
  >();

  constructor(
    private readonly userRepository: UserRepository,
    private readonly passkeyCredentialRepository: PasskeyCredentialRepository,
    private readonly invitationRepository: InvitationRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly jwtService: JwtService,
    private readonly webAuthnService: WebAuthnService
  ) {}

  async initiateRegistration(email: string, invitationToken: string) {
    // Verify invitation token
    const invitation = await this.invitationRepository.findByTokenAndEmail(
      invitationToken,
      email
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
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new BadRequestException('User already exists');
    }

    // Generate temporary user ID for registration
    const tempUserID = uuidv4();
    const options = await this.webAuthnService.generateRegistrationOptions(
      tempUserID,
      email
    );

    // Store the challenge
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
    ); // 5 minutos

    return { options };
  }

  async completeRegistration(
    email: string,
    invitationToken: string,
    credential: RegistrationResponseJSON,
    deviceName: string
  ) {
    // Retrieve stored challenge
    const challengeKey = `reg_${email}_${invitationToken}`;
    const storedData = this.challengeStore.get(challengeKey);

    if (!storedData) {
      throw new BadRequestException('Registration session expired or invalid');
    }

    // Verify registration response
    const verification = await this.webAuthnService.verifyRegistrationResponse(
      credential,
      storedData.challenge
    );

    if (!verification.verified) {
      throw new BadRequestException('Registration verification failed');
    }

    // Verify invitation token again
    const invitation = await this.invitationRepository.findByTokenAndEmail(
      invitationToken,
      email
    );

    if (!invitation || invitation.usedAt || new Date() > invitation.expiresAt) {
      throw new BadRequestException('Invalid or expired invitation token');
    }

    // Create the user
    const userId = uuidv4();
    const user = await this.userRepository.create({
      id: userId,
      email,
      role: 'user',
      isActive: true,
    });

    // Create the passkey credential
    await this.passkeyCredentialRepository.create({
      id: uuidv4(),
      userId: user.id,
      credentialId: verification.credentialId,
      publicKey: verification.publicKey,
      counter: 0,
      deviceName,
    });

    // Mark the invitation as used
    await this.invitationRepository.markAsUsed(invitationToken, email);

    // Generate JWT token
    const token = this.jwtService.generateToken(user);

    // Create session
    const sessionId = uuidv4();
    await this.sessionRepository.create({
      id: sessionId,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Clean up stored challenge
    this.challengeStore.delete(challengeKey);

    return { user, token };
  }

  async initiateLogin(email: string) {
    // Find the user
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Find user credentials
    const credentials = await this.passkeyCredentialRepository.findByUserId(
      user.id
    );

    if (!credentials || credentials.length === 0) {
      throw new UnauthorizedException(
        'No credentials registered for this user'
      );
    }

    // Generate authentication options
    const options = await this.webAuthnService.generateAuthenticationOptions(
      user.id,
      credentials.map(cred => ({
        credentialId: cred.credentialId,
        publicKey: cred.publicKey,
      }))
    );

    // Store the challenge
    const challengeKey = `auth_${email}`;
    this.challengeStore.set(challengeKey, {
      challenge: options.challenge,
      userID: user.id,
      email,
    });

    // Clean up old challenges (simple cleanup)
    setTimeout(
      () => {
        this.challengeStore.delete(challengeKey);
      },
      5 * 60 * 1000
    ); // 5 minutos

    return { options };
  }

  async completeLogin(email: string, credential: AuthenticationResponseJSON) {
    // Retrieve stored challenge
    const challengeKey = `auth_${email}`;
    const storedData = this.challengeStore.get(challengeKey);

    if (!storedData) {
      throw new UnauthorizedException(
        'Authentication session expired or invalid'
      );
    }

    // Find the user
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Find user credentials
    const credentials = await this.passkeyCredentialRepository.findByUserId(
      user.id
    );

    // Find the specific credential used
    const credentialIdBase64 = credential.id;
    const matchingCredential = credentials.find(
      cred => cred.credentialId === credentialIdBase64
    );

    if (!matchingCredential) {
      throw new UnauthorizedException('Credential not found');
    }

    // Verify authentication response
    const verification =
      await this.webAuthnService.verifyAuthenticationResponse(
        credential,
        storedData.challenge,
        {
          credentialId: matchingCredential.credentialId,
          publicKey: matchingCredential.publicKey,
          counter: matchingCredential.counter,
        }
      );

    if (!verification.verified) {
      throw new UnauthorizedException('Authentication verification failed');
    }

    // Update credential counter
    await this.passkeyCredentialRepository.updateCounter(
      matchingCredential.credentialId,
      verification.newCounter
    );

    // Update user's last login date
    const updatedUser = await this.userRepository.updateLastLogin(user.id);

    // Generate JWT token
    const token = this.jwtService.generateToken(updatedUser);

    // Create session
    const sessionId = uuidv4();
    await this.sessionRepository.create({
      id: sessionId,
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    });

    // Clean up stored challenge
    this.challengeStore.delete(challengeKey);

    return { user: updatedUser, token };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessionRepository.invalidate(sessionId);
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.userRepository.findById(userId);

    if (user && user.isActive) {
      return user;
    }

    return null;
  }
}
