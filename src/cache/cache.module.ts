import { Global, Module } from '@nestjs/common';
import Redis, { type Redis as RedisClient } from 'ioredis';

export const REDIS = Symbol('REDIS');

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: (): RedisClient => {
        const host = process.env.REDIS_HOST ?? '127.0.0.1';
        const port = Number(process.env.REDIS_PORT ?? 6379);
        const client = new Redis({ host, port, enableAutoPipelining: true });
        return client;
      },
    },
  ],
  exports: [REDIS],
})
export class CacheModule {}
