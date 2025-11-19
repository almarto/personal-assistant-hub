import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { type RegistrationResponseJSON } from '@simplewebauthn/server';

import { PasskeyCredential } from '../domain/model/passkey-credential.model';
import { User } from '../domain/model/user.model';
import { InvitationRepository } from '../domain/ports/out/invitation-repository.port';
import { JwtService } from '../domain/ports/out/jwt-service.port';
import { PasskeyCredentialRepository } from '../domain/ports/out/passkey-credential-repository.port';
import { SessionRepository } from '../domain/ports/out/session-repository.port';
import { UserRepository } from '../domain/ports/out/user-repository.port';
import { WebAuthnService } from '../domain/ports/out/webauthn-service.port';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let passkeyCredentialRepository: jest.Mocked<PasskeyCredentialRepository>;
  let invitationRepository: jest.Mocked<InvitationRepository>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let webAuthnService: jest.Mocked<WebAuthnService>;

  const mockUser = new User(
    'user-123',
    'test@example.com',
    'user',
    true,
    new Date(),
    new Date()
  );

  const mockInvitation = {
    id: 'invitation-123',
    email: 'test@example.com',
    token: 'valid-token',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    usedAt: null,
    createdAt: new Date(),
  };

  const mockRegistrationOptions = {
    challenge: 'mock-challenge',
    rp: { name: 'Test App', id: 'localhost' },
    user: {
      id: new Uint8Array([1, 2, 3, 4]),
      name: 'test@example.com',
      displayName: 'test@example.com',
    },
    pubKeyCredParams: [],
    timeout: 60000,
    attestation: 'none' as const,
  };

  const mockRegistrationResponse: RegistrationResponseJSON = {
    id: 'credential-id',
    rawId: 'credential-id',
    response: {
      clientDataJSON: 'mock-client-data',
      attestationObject: 'mock-attestation',
    },
    type: 'public-key',
    clientExtensionResults: {},
  };

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    const mockPasskeyCredentialRepository = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findByCredentialId: jest.fn(),
      updateCounter: jest.fn(),
    };

    const mockPasswordCredentialRepository = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      updateByUserId: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    const mockInvitationRepository = {
      findByTokenAndEmail: jest.fn(),
      markAsUsed: jest.fn(),
    };

    const mockSessionRepository = {
      create: jest.fn(),
      invalidate: jest.fn(),
      invalidateAllForUser: jest.fn(),
    };

    const mockJwtService = {
      generateToken: jest.fn(),
    };

    const mockWebAuthnService = {
      generateRegistrationOptions: jest.fn(),
      verifyRegistrationResponse: jest.fn(),
      generateAuthenticationOptions: jest.fn(),
      verifyAuthenticationResponse: jest.fn(),
    };

    const mockPasswordService = {
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
      validatePasswordStrength: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: 'USER_REPOSITORY', useValue: mockUserRepository },
        {
          provide: 'PASSKEY_CREDENTIAL_REPOSITORY',
          useValue: mockPasskeyCredentialRepository,
        },
        {
          provide: 'PASSWORD_CREDENTIAL_REPOSITORY',
          useValue: mockPasswordCredentialRepository,
        },
        {
          provide: 'INVITATION_REPOSITORY',
          useValue: mockInvitationRepository,
        },
        { provide: 'SESSION_REPOSITORY', useValue: mockSessionRepository },
        { provide: 'JWT_SERVICE', useValue: mockJwtService },
        { provide: 'WEBAUTHN_SERVICE', useValue: mockWebAuthnService },
        { provide: 'PASSWORD_SERVICE', useValue: mockPasswordService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get('USER_REPOSITORY');
    passkeyCredentialRepository = module.get('PASSKEY_CREDENTIAL_REPOSITORY');
    invitationRepository = module.get('INVITATION_REPOSITORY');
    sessionRepository = module.get('SESSION_REPOSITORY');
    jwtService = module.get('JWT_SERVICE');
    webAuthnService = module.get('WEBAUTHN_SERVICE');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateRegistration', () => {
    it('should successfully initiate registration with valid invitation', async () => {
      // Arrange
      invitationRepository.findByTokenAndEmail.mockResolvedValue(
        mockInvitation
      );
      userRepository.findByEmail.mockResolvedValue(null);
      webAuthnService.generateRegistrationOptions.mockResolvedValue(
        mockRegistrationOptions
      );

      // Act
      const result = await service.initiateRegistration(
        'test@example.com',
        'valid-token'
      );

      // Assert
      expect(result).toEqual({ options: mockRegistrationOptions });
      expect(invitationRepository.findByTokenAndEmail).toHaveBeenCalledWith(
        'valid-token',
        'test@example.com'
      );
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(webAuthnService.generateRegistrationOptions).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid invitation token', async () => {
      // Arrange
      invitationRepository.findByTokenAndEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.initiateRegistration('test@example.com', 'invalid-token')
      ).rejects.toThrow(new BadRequestException('Invalid invitation token'));
    });

    it('should throw BadRequestException for already used invitation', async () => {
      // Arrange
      const usedInvitation = { ...mockInvitation, usedAt: new Date() };
      invitationRepository.findByTokenAndEmail.mockResolvedValue(
        usedInvitation
      );

      // Act & Assert
      await expect(
        service.initiateRegistration('test@example.com', 'valid-token')
      ).rejects.toThrow(
        new BadRequestException('Invitation token already used')
      );
    });

    it('should throw BadRequestException for expired invitation', async () => {
      // Arrange
      const expiredInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 1000),
      };
      invitationRepository.findByTokenAndEmail.mockResolvedValue(
        expiredInvitation
      );

      // Act & Assert
      await expect(
        service.initiateRegistration('test@example.com', 'valid-token')
      ).rejects.toThrow(new BadRequestException('Invitation token expired'));
    });

    it('should throw BadRequestException if user already exists', async () => {
      // Arrange
      invitationRepository.findByTokenAndEmail.mockResolvedValue(
        mockInvitation
      );
      userRepository.findByEmail.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.initiateRegistration('test@example.com', 'valid-token')
      ).rejects.toThrow(new BadRequestException('User already exists'));
    });
  });

  describe('completeRegistration', () => {
    beforeEach(() => {
      // Setup challenge store
      const challengeKey = 'reg_test@example.com_valid-token';

      (service as any).challengeStore.set(challengeKey, {
        challenge: 'mock-challenge',
        userID: 'temp-user-id',
        email: 'test@example.com',
      });
    });

    it('should successfully complete registration', async () => {
      // Arrange
      webAuthnService.verifyRegistrationResponse.mockResolvedValue({
        verified: true,
        credentialId: 'credential-123',
        publicKey: 'public-key-123',
      });
      invitationRepository.findByTokenAndEmail.mockResolvedValue(
        mockInvitation
      );
      userRepository.create.mockResolvedValue(mockUser);
      passkeyCredentialRepository.create.mockResolvedValue(undefined);
      invitationRepository.markAsUsed.mockResolvedValue(undefined);
      jwtService.generateToken.mockReturnValue('jwt-token');
      sessionRepository.create.mockResolvedValue(undefined);

      // Act
      const result = await service.completeRegistration(
        'test@example.com',
        'valid-token',
        mockRegistrationResponse,
        'Test Device'
      );

      // Assert
      expect(result).toEqual({
        user: expect.objectContaining({
          _id: 'user-123',
          _email: 'test@example.com',
        }),
        token: 'jwt-token',
      });
      expect(webAuthnService.verifyRegistrationResponse).toHaveBeenCalled();
      expect(userRepository.create).toHaveBeenCalled();
      expect(passkeyCredentialRepository.create).toHaveBeenCalled();
      expect(invitationRepository.markAsUsed).toHaveBeenCalledWith(
        'valid-token',
        'test@example.com'
      );
    });

    it('should throw BadRequestException for expired registration session', async () => {
      // Arrange - clear challenge store

      (service as any).challengeStore.clear();

      // Act & Assert
      await expect(
        service.completeRegistration(
          'test@example.com',
          'valid-token',
          mockRegistrationResponse,
          'Test Device'
        )
      ).rejects.toThrow(
        new BadRequestException('Registration session expired or invalid')
      );
    });

    it('should throw BadRequestException for failed verification', async () => {
      // Arrange
      webAuthnService.verifyRegistrationResponse.mockResolvedValue({
        verified: false,
        credentialId: '',
        publicKey: '',
      });

      // Act & Assert
      await expect(
        service.completeRegistration(
          'test@example.com',
          'valid-token',
          mockRegistrationResponse,
          'Test Device'
        )
      ).rejects.toThrow(
        new BadRequestException('Registration verification failed')
      );
    });
  });

  describe('initiateLogin', () => {
    it('should successfully initiate login for existing user', async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(mockUser);
      passkeyCredentialRepository.findByUserId.mockResolvedValue([
        new PasskeyCredential(
          'cred-1',
          'user-123',
          'credential-123',
          'public-key',
          0,
          'Device 1',
          new Date()
        ),
      ]);
      webAuthnService.generateAuthenticationOptions.mockResolvedValue({
        challenge: 'auth-challenge',
        allowCredentials: [{ id: 'credential-123', type: 'public-key' }],
      });

      // Act
      const result = await service.initiateLogin('test@example.com');

      // Assert
      expect(result).toEqual({
        options: {
          challenge: 'auth-challenge',
          allowCredentials: [{ id: 'credential-123', type: 'public-key' }],
        },
      });
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(passkeyCredentialRepository.findByUserId).toHaveBeenCalledWith(
        'user-123'
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Arrange
      userRepository.findByEmail.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.initiateLogin('nonexistent@example.com')
      ).rejects.toThrow(new UnauthorizedException('User not found'));
    });
  });

  describe('validateUser', () => {
    it('should return user for valid userId', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await service.validateUser('user-123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should return null for invalid userId', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(null);

      // Act
      const result = await service.validateUser('invalid-user');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      sessionRepository.invalidate.mockResolvedValue(undefined);

      // Act
      await service.logout('session-123');

      // Assert
      expect(sessionRepository.invalidate).toHaveBeenCalledWith('session-123');
    });
  });
});
