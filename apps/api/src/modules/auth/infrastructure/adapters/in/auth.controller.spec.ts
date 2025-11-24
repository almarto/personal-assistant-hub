import { Test, TestingModule } from '@nestjs/testing';

import { User } from '../../../domain/model/user.model';
import {
  AUTH_USE_CASE,
  AuthUseCase,
} from '../../../domain/ports/in/auth-use-case.port';

import { AuthController } from './auth.controller';

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

  beforeEach(async () => {
    const mockAuthUseCase = {
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
