import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as schema from '@personal-assistant-hub/database/dist/schema/index.js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

@Global()
@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: (configService: ConfigService) => {
        const connectionString = configService.get<string>('DATABASE_URL');
        if (!connectionString) {
          throw new Error('DATABASE_URL is not defined');
        }

        const client = postgres(connectionString);
        return drizzle(client, { schema });
      },
      inject: [ConfigService],
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
