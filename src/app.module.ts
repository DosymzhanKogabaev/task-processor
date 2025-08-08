import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheModule } from './cache/cache.module';
import { DbModule } from './db/db.module';
import { KafkaModule } from './kafka/kafka.module';
import { MetricsModule } from './metrics/metrics.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [DbModule, KafkaModule, CacheModule, TasksModule, MetricsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
