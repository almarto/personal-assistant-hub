import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { User } from '../domain/model/user.model';
import {
  UserUseCase,
  USER_USE_CASE,
} from '../domain/ports/in/user-use-case.port';

import { UpdateUserDto } from './adapters/in/dto/users.dto';
import { UsersController } from './adapters/in/users.controller';

interface AuthenticatedRequest {
  user: {
    id: string;
    role: string;
  };
}

describe('UsersController', () => {
  let controller: UsersController;
  let userUseCase: jest.Mocked<UserUseCase>;

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

  const mockRequest = {
    user: {
      id: 'admin-123',
      role: 'admin',
    },
  };

  beforeEach(async () => {
    const mockUserUseCase = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: USER_USE_CASE,
          useValue: mockUserUseCase,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    userUseCase = module.get(USER_USE_CASE);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all users with mapped response', async () => {
      // Arrange
      const usersData = {
        users: [mockUser, mockAdminUser],
        total: 2,
      };
      userUseCase.findAll.mockResolvedValue(usersData);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual({
        users: [
          {
            id: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
            isActive: mockUser.isActive,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
            lastLoginAt: mockUser.lastLoginAt,
          },
          {
            id: mockAdminUser.id,
            email: mockAdminUser.email,
            role: mockAdminUser.role,
            isActive: mockAdminUser.isActive,
            createdAt: mockAdminUser.createdAt,
            updatedAt: mockAdminUser.updatedAt,
            lastLoginAt: mockAdminUser.lastLoginAt,
          },
        ],
        total: 2,
      });
      expect(userUseCase.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no users found', async () => {
      // Arrange
      const usersData = {
        users: [],
        total: 0,
      };
      userUseCase.findAll.mockResolvedValue(usersData);

      // Act
      const result = await controller.findAll();

      // Assert
      expect(result).toEqual({
        users: [],
        total: 0,
      });
      expect(userUseCase.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('update', () => {
    it('should successfully update user and return mapped response', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };
      const updatedUser = new User(
        'user-123',
        'newemail@example.com',
        'user',
        true,
        new Date('2023-01-01'),
        new Date('2023-01-01'),
        null
      );
      userUseCase.update.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.update(
        'user-123',
        updateUserDto,
        mockRequest as AuthenticatedRequest
      );

      // Assert
      expect(result).toEqual({
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        lastLoginAt: updatedUser.lastLoginAt,
      });
      expect(userUseCase.update).toHaveBeenCalledWith(
        'user-123',
        updateUserDto,
        'admin-123',
        'admin'
      );
    });

    it('should handle update with role change', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        role: 'admin',
      };
      const updatedUser = new User(
        'user-123',
        'test@example.com',
        'admin',
        true,
        new Date('2023-01-01'),
        new Date('2023-01-01'),
        null
      );
      userUseCase.update.mockResolvedValue(updatedUser);

      // Act
      const result = await controller.update(
        'user-123',
        updateUserDto,
        mockRequest as AuthenticatedRequest
      );

      // Assert
      expect(result).toEqual({
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        lastLoginAt: updatedUser.lastLoginAt,
      });
      expect(userUseCase.update).toHaveBeenCalledWith(
        'user-123',
        updateUserDto,
        'admin-123',
        'admin'
      );
    });

    it('should propagate ForbiddenException from use case', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };
      const forbiddenError = new ForbiddenException(
        'You do not have permission to update this user'
      );
      userUseCase.update.mockRejectedValue(forbiddenError);

      // Act & Assert
      await expect(
        controller.update(
          'user-123',
          updateUserDto,
          mockRequest as AuthenticatedRequest
        )
      ).rejects.toThrow(forbiddenError);
      expect(userUseCase.update).toHaveBeenCalledWith(
        'user-123',
        updateUserDto,
        'admin-123',
        'admin'
      );
    });

    it('should propagate NotFoundException from use case', async () => {
      // Arrange
      const updateUserDto: UpdateUserDto = {
        email: 'newemail@example.com',
      };
      const notFoundError = new NotFoundException(
        'User with ID user-123 not found'
      );
      userUseCase.update.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(
        controller.update(
          'user-123',
          updateUserDto,
          mockRequest as AuthenticatedRequest
        )
      ).rejects.toThrow(notFoundError);
      expect(userUseCase.update).toHaveBeenCalledWith(
        'user-123',
        updateUserDto,
        'admin-123',
        'admin'
      );
    });
  });

  describe('remove', () => {
    it('should successfully remove user', async () => {
      // Arrange
      const expectedResult = { message: 'User deactivated successfully' };
      userUseCase.remove.mockResolvedValue(expectedResult);

      // Act
      const result = await controller.remove(
        'user-123',
        mockRequest as AuthenticatedRequest
      );

      // Assert
      expect(result).toEqual(expectedResult);
      expect(userUseCase.remove).toHaveBeenCalledWith(
        'user-123',
        'admin-123',
        'admin'
      );
    });

    it('should propagate ForbiddenException from use case', async () => {
      // Arrange
      const forbiddenError = new ForbiddenException(
        'You do not have permission to delete this user'
      );
      userUseCase.remove.mockRejectedValue(forbiddenError);

      // Act & Assert
      await expect(
        controller.remove('user-123', mockRequest as AuthenticatedRequest)
      ).rejects.toThrow(forbiddenError);
      expect(userUseCase.remove).toHaveBeenCalledWith(
        'user-123',
        'admin-123',
        'admin'
      );
    });

    it('should propagate NotFoundException from use case', async () => {
      // Arrange
      const notFoundError = new NotFoundException(
        'User with ID user-123 not found'
      );
      userUseCase.remove.mockRejectedValue(notFoundError);

      // Act & Assert
      await expect(
        controller.remove('user-123', mockRequest as AuthenticatedRequest)
      ).rejects.toThrow(notFoundError);
      expect(userUseCase.remove).toHaveBeenCalledWith(
        'user-123',
        'admin-123',
        'admin'
      );
    });
  });

  describe('mapToUserResponseDto', () => {
    it('should correctly map User to UserResponseDto', () => {
      // Act
      const result = controller['mapToUserResponseDto'](mockUser);

      // Assert
      expect(result).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
        isActive: mockUser.isActive,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        lastLoginAt: mockUser.lastLoginAt,
      });
    });
  });

  describe('mapToUsersListResponseDto', () => {
    it('should correctly map users list with total count', () => {
      // Arrange
      const usersData = {
        users: [mockUser, mockAdminUser],
        total: 2,
      };

      // Act
      const result = controller['mapToUsersListResponseDto'](usersData);

      // Assert
      expect(result).toEqual({
        users: [
          {
            id: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
            isActive: mockUser.isActive,
            createdAt: mockUser.createdAt,
            updatedAt: mockUser.updatedAt,
            lastLoginAt: mockUser.lastLoginAt,
          },
          {
            id: mockAdminUser.id,
            email: mockAdminUser.email,
            role: mockAdminUser.role,
            isActive: mockAdminUser.isActive,
            createdAt: mockAdminUser.createdAt,
            updatedAt: mockAdminUser.updatedAt,
            lastLoginAt: mockAdminUser.lastLoginAt,
          },
        ],
        total: 2,
      });
    });

    it('should handle empty users list', () => {
      // Arrange
      const usersData = {
        users: [],
        total: 0,
      };

      // Act
      const result = controller['mapToUsersListResponseDto'](usersData);

      // Assert
      expect(result).toEqual({
        users: [],
        total: 0,
      });
    });
  });
});
