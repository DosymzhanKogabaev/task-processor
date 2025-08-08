import {
  pgTable,
  text,
  integer,
  pgEnum,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'processing',
  'done',
  'failed',
]);

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  payload: text('payload').notNull(),
  priority: integer('priority').notNull(),
  status: taskStatusEnum('status').notNull().default('pending'),
  result: text('result'),
  createdAt: timestamp('created_at', { withTimezone: false })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: false })
    .notNull()
    .defaultNow(),
});
