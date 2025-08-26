import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { users } from '@personal-assistant-hub/database/dist/schema/index.js';
import { eq } from 'drizzle-orm';

import { DATABASE_CONNECTION } from '../database/database.module';

import { UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DATABASE_CONNECTION) private readonly db: any) {}

  async findAll() {
    const allUsers = await this.db.select().from(users);

    return {
      users: allUsers.map(user => ({
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
      })),
      total: allUsers.length,
    };
  }

  async findOne(id: string) {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));

    if (!user) {
      throw new NotFoundException('User not found');
    }

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

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    currentUserId: string,
    currentUserRole: string
  ) {
    // Check if user exists
    const [existingUser] = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id));

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Only admins can update other users
    if (currentUserId !== id && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Only admins can change roles and active status
    if (
      (updateUserDto.role || updateUserDto.isActive !== undefined) &&
      currentUserRole !== 'admin'
    ) {
      throw new ForbiddenException(
        'Only admins can change user roles and status'
      );
    }

    // Prevent users from deactivating themselves
    if (currentUserId === id && updateUserDto.isActive === false) {
      throw new ForbiddenException('You cannot deactivate your own account');
    }

    const [updatedUser] = await this.db
      .update(users)
      .set({
        ...updateUserDto,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      isActive: updatedUser.isActive,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
      lastLoginAt: updatedUser.lastLoginAt,
    };
  }

  async remove(id: string, currentUserId: string, currentUserRole: string) {
    // Only admins can delete users
    if (currentUserRole !== 'admin') {
      throw new ForbiddenException('Only admins can delete users');
    }

    // Prevent admins from deleting themselves
    if (currentUserId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const [user] = await this.db.select().from(users).where(eq(users.id, id));

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete by deactivating the user
    await this.db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return { message: 'User deactivated successfully' };
  }
}
