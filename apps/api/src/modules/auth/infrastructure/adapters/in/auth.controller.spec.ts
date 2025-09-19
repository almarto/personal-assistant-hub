import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/server';

import { User } from '../../../domain/model/user.model';
import {
  AUTH_USE_CASE,
  AuthUseCase,
} from '../../../domain/ports/in/auth-use-case.port';

import { AuthController } from './auth.controller';
import {
  LoginCompleteDto,
  LoginInitiateDto,
  RegisterCompleteDto,
  RegisterInitiateDto,
  WebAuthnOptionsDto,
} from './dto/auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authUseCase: jest.Mocked<AuthUseCase>;

  const mockUser = new User(
    'user-123',
    'test@example.com',
    'user',
    true,
    new Date('2023-01-01'),
    new Date('2023-01-01')
  );

  const mockWebAuthnOptions = {
    challenge: 'mock-challenge',
    rp: { name: 'Test App', id: 'localhost' },
    user: {
      id: 'user-123',
      name: 'test@example.com',
      displayName: 'Test User',
    },
    pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
    timeout: 60000,
    attestation: 'direct',
  };

  const mockRegistrationCredential: RegistrationResponseJSON = {
    id: 'credential-id',
    rawId: 'credential-id',
    response: {
      attestationObject: 'mock-attestation-object',
      clientDataJSON: 'mock-client-data-json',
    },
    type: 'public-key',
    clientExtensionResults: {},
  };

  const mockAuthenticationCredential: AuthenticationResponseJSON = {
    id: 'credential-id',
    rawId: 'credential-id',
    response: {
      authenticatorData: 'mock-authenticator-data',
      clientDataJSON: 'mock-client-data-json',
      signature: 'mock-signature',
    },
    type: 'public-key',
    clientExtensionResults: {},
  };

  beforeEach(async () => {
    const mockAuthUseCase = {
      initiateRegistration: jest.fn(),
      completeRegistration: jest.fn(),
      initiateLogin: jest.fn(),
      completeLogin: jest.fn(),
      logout: jest.fn(),
      validateUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AUTH_USE_CASE,
          useValue: mockAuthUseCase,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authUseCase = module.get(AUTH_USE_CASE);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('initiateRegistration', () => {
    it('should successfully initiate registration', async () => {
      // Arrange
      const dto: RegisterInitiateDto = {
        email: 'test@example.com',
        invitationToken: 'invitation-token-123',
      };
      const expectedResponse: WebAuthnOptionsDto = {
        options: mockWebAuthnOptions,
      };
      authUseCase.initiateRegistration.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.initiateRegistration(dto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(authUseCase.initiateRegistration).toHaveBeenCalledWith(
        dto.email,
        dto.invitationToken
      );
    });

    it('should throw BadRequestException for invalid invitation', async () => {
      // Arrange
      const dto: RegisterInitiateDto = {
        email: 'test@example.com',
        invitationToken: 'invalid-token',
      };
      authUseCase.initiateRegistration.mockRejectedValue(
        new BadRequestException('Invalid invitation token')
      );

      // Act & Assert
      await expect(controller.initiateRegistration(dto)).rejects.toThrow(
        new BadRequestException('Invalid invitation token')
      );
    });
  });

  describe('completeRegistration', () => {
    it('should successfully complete registration', async () => {
      // Arrange
      const dto: RegisterCompleteDto = {
        email: 'test@example.com',
        invitationToken: 'invitation-token-123',
        credential: mockRegistrationCredential,
        deviceName: 'Test Device',
      };
      const expectedResponse = {
        user: mockUser,
        token: 'jwt-token-123',
      };
      authUseCase.completeRegistration.mockResolvedValue({
        user: mockUser,
        token: 'jwt-token-123',
      });

      // Act
      const result = await controller.completeRegistration(dto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(authUseCase.completeRegistration).toHaveBeenCalledWith(
        dto.email,
        dto.invitationToken,
        dto.credential,
        dto.deviceName
      );
    });

    it('should throw BadRequestException for failed verification', async () => {
      // Arrange
      const dto: RegisterCompleteDto = {
        email: 'test@example.com',
        invitationToken: 'invitation-token-123',
        credential: mockRegistrationCredential,
        deviceName: 'Test Device',
      };
      authUseCase.completeRegistration.mockRejectedValue(
        new BadRequestException('Registration verification failed')
      );

      // Act & Assert
      await expect(controller.completeRegistration(dto)).rejects.toThrow(
        new BadRequestException('Registration verification failed')
      );
    });
  });

  describe('initiateLogin', () => {
    it('should successfully initiate login', async () => {
      // Arrange
      const dto: LoginInitiateDto = {
        email: 'test@example.com',
      };
      const expectedResponse: WebAuthnOptionsDto = {
        options: mockWebAuthnOptions,
      };
      authUseCase.initiateLogin.mockResolvedValue(expectedResponse);

      // Act
      const result = await controller.initiateLogin(dto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(authUseCase.initiateLogin).toHaveBeenCalledWith(dto.email);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      // Arrange
      const dto: LoginInitiateDto = {
        email: 'nonexistent@example.com',
      };
      authUseCase.initiateLogin.mockRejectedValue(
        new UnauthorizedException('User not found')
      );

      // Act & Assert
      await expect(controller.initiateLogin(dto)).rejects.toThrow(
        new UnauthorizedException('User not found')
      );
    });
  });

  describe('completeLogin', () => {
    it('should successfully complete login', async () => {
      // Arrange
      const dto: LoginCompleteDto = {
        email: 'test@example.com',
        credential: mockAuthenticationCredential,
      };
      const expectedResponse = {
        user: mockUser,
        token: 'jwt-token-123',
      };
      authUseCase.completeLogin.mockResolvedValue({
        user: mockUser,
        token: 'jwt-token-123',
      });

      // Act
      const result = await controller.completeLogin(dto);

      // Assert
      expect(result).toEqual(expectedResponse);
      expect(authUseCase.completeLogin).toHaveBeenCalledWith(
        dto.email,
        dto.credential
      );
    });

    it('should throw UnauthorizedException for failed authentication', async () => {
      // Arrange
      const dto: LoginCompleteDto = {
        email: 'test@example.com',
        credential: mockAuthenticationCredential,
      };
      authUseCase.completeLogin.mockRejectedValue(
        new UnauthorizedException('Authentication verification failed')
      );

      // Act & Assert
      await expect(controller.completeLogin(dto)).rejects.toThrow(
        new UnauthorizedException('Authentication verification failed')
      );
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      const mockRequest = {
        user: { sessionId: 'session-123' },
      };
      authUseCase.logout.mockResolvedValue(undefined);

      // Act
      const result = await controller.logout(mockRequest);

      // Assert
      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(authUseCase.logout).toHaveBeenCalledWith('session-123');
    });
  });
});
