import { Global, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Kafka, logLevel, type Producer } from 'kafkajs';

export const KAFKA_PRODUCER = Symbol('KAFKA_PRODUCER');

@Global()
@Module({
  providers: [
    {
      provide: KAFKA_PRODUCER,
      useFactory: async (): Promise<Producer> => {
        const brokers = (process.env.KAFKA_BROKERS ?? 'localhost:9092')
          .split(',')
          .map((b) => b.trim())
          .filter(Boolean);
        const kafka = new Kafka({
          clientId: 'task-processor-api',
          brokers,
          logLevel: logLevel.NOTHING,
        });
        const producer = kafka.producer();
        await producer.connect();
        return producer;
      },
    },
  ],
  exports: [KAFKA_PRODUCER],
})
export class KafkaModule implements OnModuleDestroy, OnModuleInit {
  constructor() {}
  async onModuleInit(): Promise<void> {
    // nothing, producer is connected in factory
  }
  async onModuleDestroy(): Promise<void> {
    // no-op (Nest will dispose providers); explicit disconnect handled by garbage collection
  }
}
