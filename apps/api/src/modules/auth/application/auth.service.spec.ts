import { Test, TestingModule } from '@nestjs/testing';

import { User } from '../domain/model/user.model';
import { AUTH_USE_CASE } from '../domain/ports/in/auth-use-case.port';
import {
  INVITATION_REPOSITORY,
  InvitationRepository,
} from '../domain/ports/out/invitation-repository.port';
import { JWT_SERVICE, JwtService } from '../domain/ports/out/jwt-service.port';
import {
  PASSWORD_CREDENTIAL_REPOSITORY,
  PasswordCredentialRepository,
} from '../domain/ports/out/password-credential-repository.port';
import {
  PASSWORD_SERVICE,
  PasswordService,
} from '../domain/ports/out/password-service.port';
import {
  SESSION_REPOSITORY,
  SessionRepository,
} from '../domain/ports/out/session-repository.port';
import {
  USER_REPOSITORY,
  UserRepository,
} from '../domain/ports/out/user-repository.port';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let sessionRepository: jest.Mocked<SessionRepository>;

  const mockUser = new User(
    'user-123',
    'test@example.com',
    'user',
    true,
    new Date(),
    new Date()
  );

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    const mockPasswordCredentialRepository = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      updateByUserId: jest.fn(),
    };

    const mockInvitationRepository = {
      findByTokenAndEmail: jest.fn(),
      markAsUsed: jest.fn(),
    };

    const mockSessionRepository = {
      create: jest.fn(),
      invalidate: jest.fn(),
    };

    const mockJwtService = {
      generateToken: jest.fn(),
    };

    const mockPasswordService = {
      hashPassword: jest.fn(),
      comparePassword: jest.fn(),
      validatePasswordStrength: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: AUTH_USE_CASE,
          useClass: AuthService,
        },
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
        {
          provide: PASSWORD_CREDENTIAL_REPOSITORY,
          useValue: mockPasswordCredentialRepository,
        },
        {
          provide: INVITATION_REPOSITORY,
          useValue: mockInvitationRepository,
        },
        {
          provide: SESSION_REPOSITORY,
          useValue: mockSessionRepository,
        },
        {
          provide: JWT_SERVICE,
          useValue: mockJwtService,
        },
        {
          provide: PASSWORD_SERVICE,
          useValue: mockPasswordService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AUTH_USE_CASE);
    userRepository = module.get(USER_REPOSITORY);
    sessionRepository = module.get(SESSION_REPOSITORY);

    // Reset mocks
    jest.clearAllMocks();
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
