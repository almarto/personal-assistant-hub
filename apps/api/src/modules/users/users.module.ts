import { Module } from '@nestjs/common';

import { UserService } from './application/user.service';
import { USER_USE_CASE } from './domain/ports/in/user-use-case.port';
import { USER_REPOSITORY } from './domain/ports/out/user-repository.port';
import { UsersController } from './infrastructure/adapters/in/users.controller';
import { UserRepositoryAdapter } from './infrastructure/adapters/out/user-repository.adapter';

@Module({
  imports: [],
  controllers: [UsersController],
  providers: [
    {
      provide: USER_USE_CASE,
      useClass: UserService,
    },
    {
      provide: USER_REPOSITORY,
      useClass: UserRepositoryAdapter,
    },
  ],
  exports: [USER_USE_CASE],
})
export class UsersModule {}
