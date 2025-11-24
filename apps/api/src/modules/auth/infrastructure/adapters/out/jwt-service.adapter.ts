import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';

import { User } from '../../../domain/model/user.model';
import { JwtService } from '../../../domain/ports/out/jwt-service.port';

@Injectable()
export class JwtServiceAdapter implements JwtService {
  constructor(private readonly jwtService: NestJwtService) {}

  generateToken(user: User): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}
