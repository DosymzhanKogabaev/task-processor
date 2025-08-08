import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { DbModule } from '../db/db.module';
import { ProcessorService } from './processor.service';

@Module({
  imports: [DbModule, CacheModule],
  providers: [ProcessorService],
})
export class ProcessorModule {}
