import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

import { ConfigService } from '../../../domain/ports/out/config-service.port';

@Injectable()
export class ConfigServiceAdapter implements ConfigService {
  constructor(private readonly nestConfigService: NestConfigService) {}

  get<T = string>(key: string): T | undefined {
    return this.nestConfigService.get<T>(key);
  }
}
