import { Test, TestingModule } from '@nestjs/testing';
import { v4 as uuidv4 } from 'uuid';

import { Invitation } from '../domain/model/invitation.model';
import {
  CONFIG_SERVICE,
  ConfigService,
} from '../domain/ports/out/config-service.port';
import {
  INVITATION_REPOSITORY,
  InvitationRepository,
} from '../domain/ports/out/invitation-repository.port';

import { InvitationService } from './invitation.service';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const mockUuidv4 = jest.mocked(uuidv4);

describe('InvitationService', () => {
  let service: InvitationService;
  let invitationRepository: jest.Mocked<InvitationRepository>;
  let configService: jest.Mocked<ConfigService>;

  const mockInvitation = {
    id: 'invitation-id-123',
    token: 'generated-token-123',
    email: 'test@example.com',
    createdBy: 'creator-id-123',
    expiresAt: new Date('2024-12-31T23:59:59Z'),
    createdAt: new Date('2024-01-01T00:00:00Z'),
    usedAt: null,
    usedBy: null,
    isExpired: jest.fn().mockReturnValue(false),
    isUsed: jest.fn().mockReturnValue(false),
    isValid: jest.fn().mockReturnValue(true),
    markAsUsed: jest.fn(),
    extendExpiration: jest.fn(),
    revoke: jest.fn(),
  } as unknown as Invitation;

  beforeEach(async () => {
    const mockInvitationRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByTokenAndEmail: jest.fn(),
      update: jest.fn(),
      existsUserWithEmail: jest.fn(),
      existsPendingInvitationForEmail: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: INVITATION_REPOSITORY,
          useValue: mockInvitationRepository,
        },
        {
          provide: CONFIG_SERVICE,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    invitationRepository = module.get(INVITATION_REPOSITORY);
    configService = module.get(CONFIG_SERVICE);

    // Reset mocks
    jest.clearAllMocks();
    mockUuidv4.mockReturnValue('generated-token-123');
  });

  describe('create', () => {
    it('should successfully create an invitation', async () => {
      // Arrange
      invitationRepository.existsUserWithEmail.mockResolvedValue(false);
      invitationRepository.existsPendingInvitationForEmail.mockResolvedValue(
        false
      );
      invitationRepository.create.mockResolvedValue(mockInvitation);
      configService.get.mockReturnValue('http://localhost:3000');

      // Act
      const result = await service.create(
        'test@example.com',
        'creator-123',
        24
      );

      // Assert
      expect(invitationRepository.existsUserWithEmail).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(
        invitationRepository.existsPendingInvitationForEmail
      ).toHaveBeenCalledWith('test@example.com');
      expect(invitationRepository.create).toHaveBeenCalledWith(
        'generated-token-123',
        'test@example.com',
        'creator-123',
        expect.any(Date),
        'user'
      );
      expect(configService.get).toHaveBeenCalledWith('FRONTEND_URL');
      expect(result).toEqual({
        invitationLink:
          'http://localhost:3000/register?token=generated-token-123&email=test%40example.com',
        token: 'generated-token-123',
        expiresAt: mockInvitation.expiresAt,
      });
    });

    it('should use default frontend URL when not configured', async () => {
      // Arrange
      invitationRepository.existsUserWithEmail.mockResolvedValue(false);
      invitationRepository.existsPendingInvitationForEmail.mockResolvedValue(
        false
      );
      invitationRepository.create.mockResolvedValue(mockInvitation);
      configService.get.mockReturnValue(undefined);

      // Act
      const result = await service.create('test@example.com', 'creator-123');

      // Assert
      expect(result.invitationLink).toBe(
        'http://localhost:3000/register?token=generated-token-123&email=test%40example.com'
      );
    });

    it('should use default expiration hours when not provided', async () => {
      // Arrange
      invitationRepository.existsUserWithEmail.mockResolvedValue(false);
      invitationRepository.existsPendingInvitationForEmail.mockResolvedValue(
        false
      );
      invitationRepository.create.mockResolvedValue(mockInvitation);
      configService.get.mockReturnValue('http://localhost:5173');

      // Act
      await service.create('test@example.com', 'creator-123');

      // Assert
      const createCall = invitationRepository.create.mock.calls[0];
      const expiresAt = createCall[3] as Date;
      const now = new Date();
      const expectedExpiration = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Allow for small time differences (within 1 minute)
      expect(
        Math.abs(expiresAt.getTime() - expectedExpiration.getTime())
      ).toBeLessThan(60000);
    });

    it('should throw error when user already exists', async () => {
      // Arrange
      invitationRepository.existsUserWithEmail.mockResolvedValue(true);

      // Act & Assert
      await expect(
        service.create('test@example.com', 'creator-123')
      ).rejects.toThrow('User with this email already exists');

      expect(
        invitationRepository.existsPendingInvitationForEmail
      ).not.toHaveBeenCalled();
      expect(invitationRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error when pending invitation already exists', async () => {
      // Arrange
      invitationRepository.existsUserWithEmail.mockResolvedValue(false);
      invitationRepository.existsPendingInvitationForEmail.mockResolvedValue(
        true
      );

      // Act & Assert
      await expect(
        service.create('test@example.com', 'creator-123')
      ).rejects.toThrow('There is already a pending invitation for this email');

      expect(invitationRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all invitations', async () => {
      // Arrange
      const invitations = [mockInvitation];
      invitationRepository.findAll.mockResolvedValue(invitations);

      // Act
      const result = await service.findAll();

      // Assert
      expect(invitationRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual({
        invitations: invitations,
        total: 1,
      });
    });

    it('should return empty array when no invitations exist', async () => {
      // Arrange
      invitationRepository.findAll.mockResolvedValue([]);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual({
        invitations: [],
        total: 0,
      });
    });
  });

  describe('findOne', () => {
    it('should return invitation when found', async () => {
      // Arrange
      const mockInvitationWithMethods = {
        ...mockInvitation,
        isExpired: jest.fn().mockReturnValue(false),
        isUsed: jest.fn().mockReturnValue(false),
      } as unknown as Invitation;
      invitationRepository.findById.mockResolvedValue(
        mockInvitationWithMethods
      );

      // Act
      const result = await service.findOne('invitation-123');

      // Assert
      expect(invitationRepository.findById).toHaveBeenCalledWith(
        'invitation-123'
      );
      expect(result).toEqual(
        Object.assign(mockInvitationWithMethods, {
          isExpired: false,
          isUsed: false,
        })
      );
    });

    it('should throw error when invitation not found', async () => {
      // Arrange
      invitationRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent')).rejects.toThrow(
        'Invitation not found'
      );
    });
  });

  describe('validateToken', () => {
    it('should return invitation when token is valid', async () => {
      // Arrange
      const validInvitation = new Invitation(
        'invitation-123',
        'token-123',
        'test@example.com',
        'creator-123',
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
        new Date()
      );
      invitationRepository.findByTokenAndEmail.mockResolvedValue(
        validInvitation
      );

      // Act
      const result = await service.validateToken(
        'token-123',
        'test@example.com'
      );

      // Assert
      expect(invitationRepository.findByTokenAndEmail).toHaveBeenCalledWith(
        'token-123',
        'test@example.com'
      );
      expect(result).toEqual({
        valid: true,
        invitation: validInvitation,
      });
    });

    it('should return invalid when invitation not found', async () => {
      // Arrange
      invitationRepository.findByTokenAndEmail.mockResolvedValue(null);

      // Act
      const result = await service.validateToken(
        'invalid-token',
        'test@example.com'
      );

      // Assert
      expect(result).toEqual({
        valid: false,
        reason: 'Invalid invitation token',
      });
    });

    it('should return invalid when invitation is expired', async () => {
      // Arrange
      const expiredInvitation = new Invitation(
        'invitation-123',
        'token-123',
        'test@example.com',
        'creator-123',
        new Date(Date.now() - 24 * 60 * 60 * 1000), // Past date
        new Date()
      );
      invitationRepository.findByTokenAndEmail.mockResolvedValue(
        expiredInvitation
      );

      // Act
      const result = await service.validateToken(
        'token-123',
        'test@example.com'
      );

      // Assert
      expect(result).toEqual({
        valid: false,
        reason: 'Invitation token expired',
      });
    });

    it('should return invalid when invitation is already used', async () => {
      // Arrange
      const usedInvitation = new Invitation(
        'invitation-123',
        'token-123',
        'test@example.com',
        'creator-123',
        new Date(Date.now() + 24 * 60 * 60 * 1000), // Future date
        new Date(),
        new Date(), // Used date
        'user-123', // Used by
        'user' // Role
      );
      invitationRepository.findByTokenAndEmail.mockResolvedValue(
        usedInvitation
      );

      // Act
      const result = await service.validateToken(
        'token-123',
        'test@example.com'
      );

      // Assert
      expect(result).toEqual({
        valid: false,
        reason: 'Invitation token already used',
      });
    });
  });
});
