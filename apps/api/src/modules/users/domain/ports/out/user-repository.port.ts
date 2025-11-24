import { User } from '../../model/user.model';

export const USER_REPOSITORY = 'USER_REPOSITORY';

export interface UserRepository {
  findAll(): Promise<{ users: User[]; total: number }>;
  findById(id: string): Promise<User | null>;
  update(id: string, user: User): Promise<User>;
  deactivate(id: string): Promise<{ message: string }>;
}
