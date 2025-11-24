import { User } from '../../model/user.model';

export const JWT_SERVICE = 'JWT_SERVICE';

export interface JwtService {
  generateToken(user: User): string;
}
