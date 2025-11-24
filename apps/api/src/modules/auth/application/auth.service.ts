import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { User } from '../domain/model/user.model';
import { AuthUseCase } from '../domain/ports/in/auth-use-case.port';
import {
  InvitationRepository,
  INVITATION_REPOSITORY,
} from '../domain/ports/out/invitation-repository.port';
import { JwtService, JWT_SERVICE } from '../domain/ports/out/jwt-service.port';
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

@Injectable()
export class AuthService implements AuthUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PASSWORD_CREDENTIAL_REPOSITORY)
    private readonly passwordCredentialRepository: PasswordCredentialRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepository: InvitationRepository,
    @Inject(SESSION_REPOSITORY)
    private readonly sessionRepository: SessionRepository,
    @Inject(JWT_SERVICE)
    private readonly jwtService: JwtService,
    @Inject(PASSWORD_SERVICE)
    private readonly passwordService: PasswordService
  ) {}

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
