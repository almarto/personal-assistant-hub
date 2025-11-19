import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { User } from '../domain/model/user.model';
import { UserUseCase } from '../domain/ports/in/user-use-case.port';
import {
  UserRepository,
  USER_REPOSITORY,
} from '../domain/ports/out/user-repository.port';

@Injectable()
export class UserService implements UserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository
  ) {}

  async findAll(): Promise<{ users: User[]; total: number }> {
    return this.userRepository.findAll();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async update(
    id: string,
    updateData: {
      email?: string;
      role?: string;
      isActive?: boolean;
    },
    currentUserId: string,
    currentUserRole: string
  ): Promise<User> {
    const user = await this.findOne(id);

    // Check if the current user has permission to update this user
    if (!user.canBeUpdatedBy(currentUserId, currentUserRole)) {
      throw new ForbiddenException(
        'You do not have permission to update this user'
      );
    }

    // Apply updates
    if (updateData.email) {
      user.updateEmail(updateData.email);
    }

    if (updateData.role) {
      user.updateRole(updateData.role);
    }

    if (updateData.isActive !== undefined) {
      if (updateData.isActive) {
        user.activate();
      } else {
        // Check if the user can be deactivated
        if (!user.canBeDeactivatedBy(currentUserId, currentUserRole)) {
          throw new ForbiddenException('You cannot deactivate yourself');
        }
        user.deactivate();
      }
    }

    // Save the updated user
    return this.userRepository.update(id, user);
  }

  async remove(
    id: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<{ message: string }> {
    const user = await this.findOne(id);

    // Check if the current user has permission to delete this user
    if (!user.canBeDeletedBy(currentUserId, currentUserRole)) {
      throw new ForbiddenException(
        'You do not have permission to delete this user'
      );
    }

    // Soft delete by deactivating the user
    return this.userRepository.deactivate(id);
  }
}
