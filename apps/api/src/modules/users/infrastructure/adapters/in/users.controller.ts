import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '@/modules/auth/infrastructure/adapters/in/decorators/roles.decorator';
import { JwtAuthGuard } from '@/modules/auth/infrastructure/adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/infrastructure/adapters/in/guards/roles.guard';
import { User } from '@/modules/users/domain/model/user.model';
import {
  UserUseCase,
  USER_USE_CASE,
} from '@/modules/users/domain/ports/in/user-use-case.port';

import {
  UpdateUserDto,
  UserResponseDto,
  UsersListResponseDto,
} from './dto/users.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    @Inject(USER_USE_CASE) private readonly userUseCase: UserUseCase
  ) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({
    status: 200,
    description: 'List of users',
    type: UsersListResponseDto,
  })
  async findAll(): Promise<UsersListResponseDto> {
    const result = await this.userUseCase.findAll();
    return this.mapToUsersListResponseDto(result);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiResponse({
    status: 200,
    description: 'The user',
    type: UserResponseDto,
  })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.userUseCase.findOne(id);
    return this.mapToUserResponseDto(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiResponse({
    status: 200,
    description: 'The updated user',
    type: UserResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req
  ): Promise<UserResponseDto> {
    const user = await this.userUseCase.update(
      id,
      updateUserDto,
      req.user.id,
      req.user.role
    );
    return this.mapToUserResponseDto(user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a user' })
  @ApiResponse({
    status: 200,
    description: 'Success message',
  })
  async remove(@Param('id') id: string, @Request() req) {
    return this.userUseCase.remove(id, req.user.id, req.user.role);
  }

  private mapToUserResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private mapToUsersListResponseDto(result: {
    users: User[];
    total: number;
  }): UsersListResponseDto {
    return {
      users: result.users.map(this.mapToUserResponseDto),
      total: result.total,
    };
  }
}
