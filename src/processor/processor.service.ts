import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Redis as RedisClient } from 'ioredis';
import { Kafka, logLevel, type Consumer, type Producer } from 'kafkajs';
import { REDIS } from '../cache/cache.module';
import { DRIZZLE } from '../db/db.module';
import { tasks } from '../db/schema';

interface InputMessage {
  taskId: string;
  payload: string;
  priority: number;
}

interface OutputMessage {
  taskId: string;
  result: string;
  processedAt: string; // ISO
}

@Injectable()
export class ProcessorService implements OnModuleInit {
  private readonly logger = new Logger(ProcessorService.name);
  private consumer!: Consumer;
  private producer!: Producer;
  private readonly cacheTtlSeconds = 3600;

  constructor(
    @Inject(DRIZZLE) private readonly db: NodePgDatabase,
    @Inject(REDIS) private readonly redis: RedisClient,
  ) {}

  async onModuleInit(): Promise<void> {
    const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
    const kafka = new Kafka({
      clientId: 'task-processor-worker',
      brokers,
      logLevel: logLevel.NOTHING,
    });
    this.consumer = kafka.consumer({ groupId: 'task-processor-group' });
    this.producer = kafka.producer();

    await this.producer.connect();
    await this.consumer.connect();
    await this.consumer.subscribe({
      topic: 'tasks-input',
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        let input: InputMessage;
        try {
          input = JSON.parse(message.value.toString()) as InputMessage;
        } catch (err) {
          this.logger.error('Invalid input message JSON', err as Error);
          return;
        }

        // Mark as processing
        try {
          await this.db
            .update(tasks)
            .set({ status: 'processing', updatedAt: new Date() })
            .where(eq(tasks.id, input.taskId));
        } catch (err) {
          this.logger.warn(
            `Failed to mark processing for ${input.taskId}`,
            err as Error,
          );
        }

        const processedAt = new Date().toISOString();
        const reversed = input.payload.split('').reverse().join('');
        const resultPayload = `${reversed} (len=${input.payload.length})`;

        const output: OutputMessage = {
          taskId: input.taskId,
          result: resultPayload,
          processedAt,
        };

        try {
          // Update DB: store only the result string
          await this.db
            .update(tasks)
            .set({
              status: 'done',
              result: resultPayload,
              updatedAt: new Date(),
            })
            .where(eq(tasks.id, input.taskId));

          // Cache full result object
          await this.redis.set(
            this.cacheKey(input.taskId),
            JSON.stringify(output),
            'EX',
            this.cacheTtlSeconds,
          );

          // Publish result
          await this.producer.send({
            topic: 'tasks-output',
            messages: [{ key: input.taskId, value: JSON.stringify(output) }],
          });

          this.logger.log(`Processed task ${input.taskId}`);
        } catch (err) {
          this.logger.error(
            `Processing failed for ${input.taskId}`,
            err as Error,
          );
          await this.db
            .update(tasks)
            .set({ status: 'failed', updatedAt: new Date() })
            .where(eq(tasks.id, input.taskId));
        }
      },
    });
  }

  private cacheKey(taskId: string): string {
    return `task:result:${taskId}`;
  }
}
