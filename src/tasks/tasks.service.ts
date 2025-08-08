import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Redis as RedisClient } from 'ioredis';
import type { Producer } from 'kafkajs';
import { REDIS } from '../cache/cache.module';
import { DRIZZLE } from '../db/db.module';
import { tasks } from '../db/schema';
import { KAFKA_PRODUCER } from '../kafka/kafka.module';
import type { CreateTaskDto } from './dto/create-task.dto';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly cacheTtlSeconds = 3600;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    @Inject(KAFKA_PRODUCER) private readonly producer: Producer,
    @Inject(REDIS) private readonly redis: RedisClient,
  ) {}

  async create(dto: CreateTaskDto) {
    const [row] = await this.db
      .insert(tasks)
      .values({ payload: dto.payload, priority: dto.priority })
      .returning();

    const message = {
      taskId: row.id,
      payload: row.payload,
      priority: row.priority,
    } satisfies {
      taskId: string;
      payload: string;
      priority: number;
    };

    try {
      await this.producer.send({
        topic: 'tasks-input',
        messages: [{ key: row.id, value: JSON.stringify(message) }],
      });
      this.logger.log(`Published task ${row.id} to tasks-input`);
    } catch (err) {
      this.logger.error(`Failed to publish task ${row.id}`, err as Error);
    }

    return { id: row.id, status: row.status, createdAt: row.createdAt };
  }

  private cacheKey(taskId: string): string {
    return `task:result:${taskId}`;
  }

  async findById(id: string) {
    // cache-first
    const cached = await this.redis.get(this.cacheKey(id));
    if (cached) {
      return JSON.parse(cached) as unknown;
    }

    const [row] = await this.db.select().from(tasks).where(eq(tasks.id, id));
    if (!row) return null;

    if (row.status === 'done' && row.result) {
      const wrapped = {
        taskId: row.id,
        result: row.result,
        processedAt: row.updatedAt?.toISOString?.() ?? new Date().toISOString(),
      };
      await this.redis.set(
        this.cacheKey(id),
        JSON.stringify(wrapped),
        'EX',
        this.cacheTtlSeconds,
      );
      return wrapped;
    }

    return row;
  }
}
