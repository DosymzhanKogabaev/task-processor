import { Controller, Get, Inject } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE } from '../db/db.module';

type MetricsRow = { total: number; avg_sec: number | null };

@Controller('metrics')
export class MetricsController {
  constructor(@Inject(DRIZZLE) private readonly db: NodePgDatabase) {}

  @Get()
  async getMetrics() {
    const result = (await this.db.execute(
      sql`SELECT COUNT(*)::int AS total,
                 AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) AS avg_sec
           FROM tasks
           WHERE status = 'done'`,
    )) as unknown as { rows: MetricsRow[] };

    const agg: MetricsRow = result.rows?.[0] ?? { total: 0, avg_sec: null };
    const averageProcessingTimeMs =
      agg.avg_sec != null ? Math.round(agg.avg_sec * 1000) : null;
    return {
      totalTasks: agg.total,
      averageProcessingTimeMs,
    };
  }
}
