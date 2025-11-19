import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from '../application/auth.service';
import { AUTH_USE_CASE } from '../domain/ports/in/auth-use-case.port';
import { INVITATION_REPOSITORY } from '../domain/ports/out/invitation-repository.port';
import { JWT_SERVICE } from '../domain/ports/out/jwt-service.port';
import { PASSKEY_CREDENTIAL_REPOSITORY } from '../domain/ports/out/passkey-credential-repository.port';
import { PASSWORD_CREDENTIAL_REPOSITORY } from '../domain/ports/out/password-credential-repository.port';
import { PASSWORD_SERVICE } from '../domain/ports/out/password-service.port';
import { SESSION_REPOSITORY } from '../domain/ports/out/session-repository.port';
import { USER_REPOSITORY } from '../domain/ports/out/user-repository.port';
import { WEBAUTHN_SERVICE } from '../domain/ports/out/webauthn-service.port';

import { AuthController } from './adapters/in/auth.controller';
import { JwtAuthGuard } from './adapters/in/guards/jwt-auth.guard';
import { RolesGuard } from './adapters/in/guards/roles.guard';
import { JwtStrategy } from './adapters/in/strategies/jwt.strategy';
import { InvitationRepositoryAdapter } from './adapters/out/invitation-repository.adapter';
import { JwtServiceAdapter } from './adapters/out/jwt-service.adapter';
import { PasskeyCredentialRepositoryAdapter } from './adapters/out/passkey-credential-repository.adapter';
import { PasswordCredentialRepositoryAdapter } from './adapters/out/password-credential-repository.adapter';
import { PasswordServiceAdapter } from './adapters/out/password-service.adapter';
import { SessionRepositoryAdapter } from './adapters/out/session-repository.adapter';
import { UserRepositoryAdapter } from './adapters/out/user-repository.adapter';
import { WebAuthnServiceAdapter } from './adapters/out/webauthn-service.adapter';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'your-secret-key',
        signOptions: { expiresIn: '24h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    // Application Services
    {
      provide: AUTH_USE_CASE,
      useClass: AuthService,
    },

    // Infrastructure Adapters - Out
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryAdapter,
    },
    {
      provide: PASSKEY_CREDENTIAL_REPOSITORY,
      useClass: PasskeyCredentialRepositoryAdapter,
    },
    {
      provide: PASSWORD_CREDENTIAL_REPOSITORY,
      useClass: PasswordCredentialRepositoryAdapter,
    },
    {
      provide: INVITATION_REPOSITORY,
      useClass: InvitationRepositoryAdapter,
    },
    {
      provide: SESSION_REPOSITORY,
      useClass: SessionRepositoryAdapter,
    },
    {
      provide: JWT_SERVICE,
      useClass: JwtServiceAdapter,
    },
    {
      provide: WEBAUTHN_SERVICE,
      useClass: WebAuthnServiceAdapter,
    },
    {
      provide: PASSWORD_SERVICE,
      useClass: PasswordServiceAdapter,
    },

    // Infrastructure Adapters - In
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [AUTH_USE_CASE, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
