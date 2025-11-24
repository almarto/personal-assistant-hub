import { User } from '../../model/user.model';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: {
    id: string;
    email: string;
    role: string;
    isActive: boolean;
  }): Promise<User>;
  findById(id: string): Promise<User | null>;
  updateLastLogin(id: string): Promise<User>;
}
