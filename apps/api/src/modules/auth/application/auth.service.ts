import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../domain/model/user.model';
import { AuthUseCase } from '../domain/ports/in/auth-use-case.port';
import {
  InvitationRepository,
  INVITATION_REPOSITORY,
} from '../domain/ports/out/invitation-repository.port';
import { JwtService, JWT_SERVICE } from '../domain/ports/out/jwt-service.port';
import {
  PasskeyCredentialRepository,
  PASSKEY_CREDENTIAL_REPOSITORY,
} from '../domain/ports/out/passkey-credential-repository.port';
import {
  PasswordCredentialRepository,
  PASSWORD_CREDENTIAL_REPOSITORY,
} from '../domain/ports/out/password-credential-repository.port';
import {
  PasswordService,
  PASSWORD_SERVICE,
} from '../domain/ports/out/password-service.port';
import {
  SessionRepository,
  SESSION_REPOSITORY,
} from '../domain/ports/out/session-repository.port';
import {
  UserRepository,
  USER_REPOSITORY,
} from '../domain/ports/out/user-repository.port';
import {
  WebAuthnService,
  WEBAUTHN_SERVICE,
} from '../domain/ports/out/webauthn-service.port';

@Injectable()
export class AuthService implements AuthUseCase {
  private challengeStore = new Map<
    string,
    { challenge: string; userID?: string; email?: string }
  >();

  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSKEY_CREDENTIAL_REPOSITORY)
    private readonly passkeyCredentialRepository: PasskeyCredentialRepository,
    @Inject(PASSWORD_CREDENTIAL_REPOSITORY)
    private readonly passwordCredentialRepository: PasswordCredentialRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: InvitationRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
    @Inject(JWT_SERVICE)
    private readonly jwtService: JwtService,
    @Inject(WEBAUTHN_SERVICE)
    private readonly webAuthnService: WebAuthnService,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService
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

    // Create the user with the role from the invitation
    const userId = uuidv4();
    const user = await this.userRepository.create({
      id: userId,
      email,
      role: invitation.role,
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

  async registerWithPassword(
    email: string,
    password: string,
    invitationToken: string
  ): Promise<{ user: User; token: string }> {
    // Validate password strength
    const passwordValidation =
      this.passwordService.validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`
      );
    }

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

    // Create the user
    const userId = uuidv4();
    const user = await this.userRepository.create({
      id: userId,
      email,
      role: invitation.role,
      isActive: true,
    });

    // Hash the password and create password credential
    const hash = await this.passwordService.hashPassword(password);

    await this.passwordCredentialRepository.create({
      id: uuidv4(),
      userId: user.id,
      passwordHash: hash,
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

    return { user, token };
  }

  async loginWithPassword(
    email: string,
    password: string
  ): Promise<{ user: User; token: string }> {
    // Find the user
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is not active');
    }

    // Find password credential
    const passwordCredential =
      await this.passwordCredentialRepository.findByUserId(user.id);

    if (!passwordCredential) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await this.passwordService.verifyPassword(
      password,
      passwordCredential.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

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

    return { user: updatedUser, token };
  }

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    // Validate new password strength
    const passwordValidation =
      this.passwordService.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`
      );
    }

    // Find the user
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Find existing password credential
    const existingCredential =
      await this.passwordCredentialRepository.findByUserId(userId);

    if (!existingCredential) {
      throw new BadRequestException('No password credential found for user');
    }

    // Verify old password
    const isOldPasswordValid = await this.passwordService.verifyPassword(
      oldPassword,
      existingCredential.passwordHash
    );

    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash the new password and update credential
    const hash = await this.passwordService.hashPassword(newPassword);
    await this.passwordCredentialRepository.updateByUserId(userId, {
      passwordHash: hash,
    });
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.userRepository.findById(userId);

    if (user && user.isActive) {
      return user;
    }

    return null;
  }
}
