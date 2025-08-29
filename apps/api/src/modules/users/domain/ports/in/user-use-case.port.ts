import { User } from '../../model/user.model';

export const USER_USE_CASE = 'USER_USE_CASE';

export interface UserUseCase {
  /**
   * Retrieves all users
   * @returns A list of all users and the total count
   */
  findAll(): Promise<{ users: User[]; total: number }>;

  /**
   * Finds a user by ID
   * @param id The user ID
   * @returns The user if found
   * @throws NotFoundException if the user is not found
   */
  findOne(id: string): Promise<User>;

  /**
   * Updates a user
   * @param id The user ID
   * @param updateData The data to update
   * @param currentUserId The ID of the user making the request
   * @param currentUserRole The role of the user making the request
   * @returns The updated user
   * @throws NotFoundException if the user is not found
   * @throws ForbiddenException if the user is not authorized to update
   */
  update(
    id: string,
    updateData: {
      email?: string;
      role?: string;
      isActive?: boolean;
    },
    currentUserId: string,
    currentUserRole: string
  ): Promise<User>;

  /**
   * Removes (deactivates) a user
   * @param id The user ID
   * @param currentUserId The ID of the user making the request
   * @param currentUserRole The role of the user making the request
   * @returns A success message
   * @throws NotFoundException if the user is not found
   * @throws ForbiddenException if the user is not authorized to remove
   */
  remove(
    id: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<{ message: string }>;
}
