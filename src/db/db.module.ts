import { Global, Module } from '@nestjs/common';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema';

export const PG_POOL = Symbol('PG_POOL');
export const DRIZZLE = Symbol('DRIZZLE_DB');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: (): Pool => {
        const poolConfig: PoolConfig = {
          host: process.env.DATABASE_HOST ?? 'localhost',
          port: Number(process.env.DATABASE_PORT ?? 5432),
          user: process.env.DATABASE_USER ?? 'task',
          password: process.env.DATABASE_PASSWORD ?? 'task',
          database: process.env.DATABASE_NAME ?? 'taskdb',
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        const pool: Pool = new Pool(poolConfig);
        return pool;
      },
    },
    {
      provide: DRIZZLE,
      useFactory: (pool: Pool): NodePgDatabase<typeof schema> => {
        const drizzleConfig = { schema } as const;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const db: NodePgDatabase<typeof schema> = drizzle(pool, drizzleConfig);
        return db;
      },
      inject: [PG_POOL],
    },
  ],
  exports: [PG_POOL, DRIZZLE],
})
export class DbModule {}
