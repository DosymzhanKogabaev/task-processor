import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ProcessorModule } from './processor.module';

async function bootstrap() {
  await NestFactory.createApplicationContext(ProcessorModule, {
    logger: ['error', 'warn', 'log'],
  });
  const logger = new Logger('WorkerBootstrap');
  logger.log('Processor worker started');

  // Keep the process alive; Nest application context keeps consumers running
}

void bootstrap();
