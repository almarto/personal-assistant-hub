import { Test, TestingModule } from '@nestjs/testing';

import { Invitation } from '../../../domain/model/invitation.model';
import {
  INVITATION_USE_CASE,
  InvitationUseCase,
} from '../../../domain/ports/in/invitation-use-case.port';

import { InvitationsController } from './invitations.controller';

describe('InvitationsController', () => {
  let controller: InvitationsController;
  let invitationUseCase: jest.Mocked<InvitationUseCase>;

  const mockInvitation = new Invitation(
    'invitation-123',
    'token-123',
    'test@example.com',
    'creator-123',
    new Date('2024-12-31T23:59:59Z'),
    new Date('2024-01-01T00:00:00Z'),
    'user'
  );

  const mockRequest = {
    user: {
      id: 'user-123',
      email: 'admin@example.com',
      role: 'admin',
    },
  };

  beforeEach(async () => {
    const mockInvitationUseCase = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      validateToken: jest.fn(),
      resend: jest.fn(),
      revoke: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InvitationsController],
      providers: [
        {
          provide: INVITATION_USE_CASE,
          useValue: mockInvitationUseCase,
        },
      ],
    }).compile();

    controller = module.get<InvitationsController>(InvitationsController);
    invitationUseCase = module.get(INVITATION_USE_CASE);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should successfully create an invitation', async () => {
      // Arrange
      const createDto = {
        email: 'test@example.com',
        expirationHours: 48,
      };
      const expectedResult = {
        invitationLink:
          'http://localhost:5173/register?token=token-123&email=test%40example.com',
        token: 'token-123',
        expiresAt: new Date('2024-12-31T23:59:59Z'),
      };
      invitationUseCase.create.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.create(createDto, mockRequest as any);

      // Assert
      expect(invitationUseCase.create).toHaveBeenCalledWith(
        'test@example.com',
        'user-123',
        48,
        undefined
      );
      expect(result).toEqual(expectedResult);
    });

    it('should create invitation with default expiration when not provided', async () => {
      // Arrange
      const createDto = {
        email: 'test@example.com',
      };
      const expectedResult = {
        invitationLink:
          'http://localhost:5173/register?token=token-123&email=test%40example.com',
        token: 'token-123',
        expiresAt: new Date('2024-12-31T23:59:59Z'),
      };
      invitationUseCase.create.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.create(createDto, mockRequest as any);

      // Assert
      expect(invitationUseCase.create).toHaveBeenCalledWith(
        'test@example.com',
        'user-123',
        undefined,
        undefined
      );
      expect(result).toEqual(expectedResult);
    });

    it('should propagate errors from use case', async () => {
      // Arrange
      const createDto = {
        email: 'test@example.com',
      };
      const error = new Error('User with this email already exists');
      invitationUseCase.create.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.create(createDto, mockRequest as any)
      ).rejects.toThrow(error);
    });
  });

  describe('findAll', () => {
    it('should return all invitations', async () => {
      // Arrange
      const invitationsResponse = {
        invitations: [
          Object.assign(mockInvitation, { isExpired: false, isUsed: false }),
        ],
        total: 1,
      };
      invitationUseCase.findAll.mockResolvedValue(invitationsResponse);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(invitationUseCase.findAll).toHaveBeenCalled();
      expect(result).toEqual(invitationsResponse);
    });

    it('should return empty array when no invitations exist', async () => {
      // Arrange
      const emptyResponse = { invitations: [], total: 0 };
      invitationUseCase.findAll.mockResolvedValue(emptyResponse);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual(emptyResponse);
    });

    it('should propagate errors from use case', async () => {
      // Arrange
      const error = new Error('Database error');
      invitationUseCase.findAll.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findAll()).rejects.toThrow(error);
    });
  });

  describe('validateToken', () => {
    it('should validate token successfully', async () => {
      // Arrange
      const validationResponse = {
        valid: true,
        invitation: mockInvitation,
      };
      invitationUseCase.validateToken.mockResolvedValue(validationResponse);

      // Act
      const result = await controller.validateToken(
        'token-123',
        'test@example.com'
      );

      // Assert
      expect(invitationUseCase.validateToken).toHaveBeenCalledWith(
        'token-123',
        'test@example.com'
      );
      expect(result).toEqual(validationResponse);
    });

    it('should return invalid for invalid token', async () => {
      // Arrange
      const invalidResponse = {
        valid: false,
        reason: 'Token not found',
      };
      invitationUseCase.validateToken.mockResolvedValue(invalidResponse);

      // Act
      const result = await controller.validateToken(
        'invalid-token',
        'test@example.com'
      );

      // Assert
      expect(result).toEqual(invalidResponse);
    });

    it('should propagate errors from use case', async () => {
      // Arrange
      const error = new Error('Validation error');
      invitationUseCase.validateToken.mockRejectedValue(error);

      // Act & Assert
      await expect(
        controller.validateToken('token-123', 'test@example.com')
      ).rejects.toThrow(error);
    });
  });

  describe('findOne', () => {
    it('should return invitation when found', async () => {
      // Arrange
      const invitationWithStatus = Object.assign(mockInvitation, {
        isExpired: false,
        isUsed: false,
      });
      invitationUseCase.findOne.mockResolvedValue(invitationWithStatus);

      // Act
      const result = await controller.findOne('invitation-123');

      // Assert
      expect(invitationUseCase.findOne).toHaveBeenCalledWith('invitation-123');
      expect(result).toEqual(invitationWithStatus);
    });

    it('should return null when invitation not found', async () => {
      // Arrange
      invitationUseCase.findOne.mockResolvedValue(null);

      // Act
      const result = await controller.findOne('non-existent');

      // Assert
      expect(result).toBeNull();
    });

    it('should propagate errors from use case', async () => {
      // Arrange
      const error = new Error('Database error');
      invitationUseCase.findOne.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.findOne('invitation-123')).rejects.toThrow(error);
    });
  });

  describe('resend', () => {
    it('should resend invitation successfully', async () => {
      // Arrange
      const body = { expirationHours: 72 };
      const expectedResult = {
        invitationLink:
          'http://localhost:5173/register?token=new-token-123&email=test%40example.com',
        token: 'new-token-123',
        expiresAt: new Date('2024-12-31T23:59:59Z'),
      };
      invitationUseCase.resend.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.resend('invitation-123', body);

      // Assert
      expect(invitationUseCase.resend).toHaveBeenCalledWith(
        'invitation-123',
        72
      );
      expect(result).toEqual(expectedResult);
    });

    it('should resend invitation with default expiration when not provided', async () => {
      // Arrange
      const body = {};
      const expectedResult = {
        invitationLink:
          'http://localhost:5173/register?token=new-token-123&email=test%40example.com',
        token: 'new-token-123',
        expiresAt: new Date('2024-12-31T23:59:59Z'),
      };
      invitationUseCase.resend.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.resend('invitation-123', body);

      // Assert
      expect(invitationUseCase.resend).toHaveBeenCalledWith(
        'invitation-123',
        undefined
      );
      expect(result).toEqual(expectedResult);
    });

    it('should resend invitation without body parameter', async () => {
      // Arrange
      const expectedResult = {
        invitationLink:
          'http://localhost:5173/register?token=new-token-123&email=test%40example.com',
        token: 'new-token-123',
        expiresAt: new Date('2024-12-31T23:59:59Z'),
      };
      invitationUseCase.resend.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.resend('invitation-123');

      // Assert
      expect(invitationUseCase.resend).toHaveBeenCalledWith(
        'invitation-123',
        undefined
      );
      expect(result).toEqual(expectedResult);
    });

    it('should propagate errors from use case', async () => {
      // Arrange
      const error = new Error('Cannot resend used invitation');
      invitationUseCase.resend.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.resend('invitation-123')).rejects.toThrow(error);
    });
  });

  describe('revoke', () => {
    it('should revoke invitation successfully', async () => {
      // Arrange
      const revokeResponse = {
        message: 'Invitation revoked successfully',
      };
      invitationUseCase.revoke.mockResolvedValue(revokeResponse);

      // Act
      const result = await controller.revoke('invitation-123');

      // Assert
      expect(invitationUseCase.revoke).toHaveBeenCalledWith('invitation-123');
      expect(result).toEqual(revokeResponse);
    });

    it('should propagate errors from use case', async () => {
      // Arrange
      const error = new Error('Cannot revoke used invitation');
      invitationUseCase.revoke.mockRejectedValue(error);

      // Act & Assert
      await expect(controller.revoke('invitation-123')).rejects.toThrow(error);
    });
  });
});
