import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { InvitationService } from './application/invitation.service';
import { INVITATION_USE_CASE } from './domain/ports/in/invitation-use-case.port';
import { CONFIG_SERVICE } from './domain/ports/out/config-service.port';
import { INVITATION_REPOSITORY } from './domain/ports/out/invitation-repository.port';
import { InvitationsController } from './infrastructure/adapters/in/invitations.controller';
import { ConfigServiceAdapter } from './infrastructure/adapters/out/config-service.adapter';
import { InvitationRepositoryAdapter } from './infrastructure/adapters/out/invitation-repository.adapter';

@Module({
  controllers: [InvitationsController],
  providers: [
    // Casos de uso
    {
      provide: INVITATION_USE_CASE,
      useClass: InvitationService,
    },
    // Adaptadores de salida
    {
      provide: INVITATION_REPOSITORY,
      useClass: InvitationRepositoryAdapter,
    },
    {
      provide: CONFIG_SERVICE,
      useFactory: (configService: ConfigService) => {
        return new ConfigServiceAdapter(configService);
      },
      inject: [ConfigService],
    },
  ],
  exports: [INVITATION_USE_CASE],
})
export class InvitationsModule {}
