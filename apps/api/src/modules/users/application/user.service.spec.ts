import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '../domain/model/user.model';
import {
  UserRepository,
  USER_REPOSITORY,
} from '../domain/ports/out/user-repository.port';

import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;

  const mockUser = new User(
    'user-123',
    'test@example.com',
    'user',
    true,
    new Date('2023-01-01'),
    new Date('2023-01-01'),
    null
  );

  const mockAdminUser = new User(
    'admin-123',
    'admin@example.com',
    'admin',
    true,
    new Date('2023-01-01'),
    new Date('2023-01-01'),
    null
  );

  beforeEach(async () => {
    const mockUserRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: USER_REPOSITORY,
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(USER_REPOSITORY);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users with total count', async () => {
      // Arrange
      const expectedResult = {
        users: [mockUser, mockAdminUser],
        total: 2,
      };
      userRepository.findAll.mockResolvedValue(expectedResult);

      // Act
      const result = await service.findAll();

      // Assert
      expect(result).toEqual(expectedResult);
      expect(userRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(mockUser);

      // Act
      const result = await service.findOne('user-123');

      // Assert
      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
    });

    it('should throw NotFoundException when user not found', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findOne('non-existent')).rejects.toThrow(
        new NotFoundException('User with ID non-existent not found')
      );
      expect(userRepository.findById).toHaveBeenCalledWith('non-existent');
    });
  });

  describe('update', () => {
    it('should successfully update user email when user updates own profile', async () => {
      // Arrange
      const updateData = { email: 'newemail@example.com' };
      const updatedUser = new User(
        'user-123',
        'newemail@example.com',
        'user',
        true,
        new Date('2023-01-01'),
        new Date('2023-01-01'),
        null
      );
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(
        'user-123',
        updateData,
        'user-123',
        'user'
      );

      // Assert
      expect(result).toEqual(updatedUser);
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(userRepository.update).toHaveBeenCalledWith(
        'user-123',
        expect.any(User)
      );
    });

    it('should successfully update user role when admin updates user', async () => {
      // Arrange
      const updateData = { role: 'admin' };
      const updatedUser = new User(
        'user-123',
        'test@example.com',
        'admin',
        true,
        new Date('2023-01-01'),
        new Date('2023-01-01'),
        null
      );
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(updatedUser);

      // Act
      const result = await service.update(
        'user-123',
        updateData,
        'admin-123',
        'admin'
      );

      // Assert
      expect(result).toEqual(updatedUser);
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(userRepository.update).toHaveBeenCalledWith(
        'user-123',
        expect.any(User)
      );
    });

    it('should successfully deactivate user when admin updates isActive to false', async () => {
      // Arrange
      const updateData = { isActive: false };
      const deactivatedUser = new User(
        'user-123',
        'test@example.com',
        'user',
        false,
        new Date('2023-01-01'),
        new Date('2023-01-01'),
        null
      );
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.update.mockResolvedValue(deactivatedUser);

      // Act
      const result = await service.update(
        'user-123',
        updateData,
        'admin-123',
        'admin'
      );

      // Assert
      expect(result).toEqual(deactivatedUser);
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(userRepository.update).toHaveBeenCalledWith(
        'user-123',
        expect.any(User)
      );
    });

    it('should throw ForbiddenException when user tries to update another user', async () => {
      // Arrange
      const updateData = { email: 'newemail@example.com' };
      userRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.update('user-123', updateData, 'other-user', 'user')
      ).rejects.toThrow(
        new ForbiddenException('You do not have permission to update this user')
      );
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when user tries to deactivate themselves', async () => {
      // Arrange
      const updateData = { isActive: false };
      userRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.update('user-123', updateData, 'user-123', 'user')
      ).rejects.toThrow(
        new ForbiddenException('You cannot deactivate yourself')
      );
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when trying to update non-existent user', async () => {
      // Arrange
      const updateData = { email: 'newemail@example.com' };
      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update('non-existent', updateData, 'admin-123', 'admin')
      ).rejects.toThrow(
        new NotFoundException('User with ID non-existent not found')
      );
      expect(userRepository.findById).toHaveBeenCalledWith('non-existent');
      expect(userRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should successfully remove user when admin removes another user', async () => {
      // Arrange
      const expectedResult = { message: 'User deactivated successfully' };
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.deactivate.mockResolvedValue(expectedResult);

      // Act
      const result = await service.remove('user-123', 'admin-123', 'admin');

      // Assert
      expect(result).toEqual(expectedResult);
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(userRepository.deactivate).toHaveBeenCalledWith('user-123');
    });

    it('should throw ForbiddenException when user tries to remove themselves', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.remove('user-123', 'user-123', 'user')
      ).rejects.toThrow(
        new ForbiddenException('You do not have permission to delete this user')
      );
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(userRepository.deactivate).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-admin tries to remove user', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(mockUser);

      // Act & Assert
      await expect(
        service.remove('user-123', 'other-user', 'user')
      ).rejects.toThrow(
        new ForbiddenException('You do not have permission to delete this user')
      );
      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(userRepository.deactivate).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when trying to remove non-existent user', async () => {
      // Arrange
      userRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.remove('non-existent', 'admin-123', 'admin')
      ).rejects.toThrow(
        new NotFoundException('User with ID non-existent not found')
      );
      expect(userRepository.findById).toHaveBeenCalledWith('non-existent');
      expect(userRepository.deactivate).not.toHaveBeenCalled();
    });
  });
});
