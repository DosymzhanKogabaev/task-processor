# Task Processor (RU)

Микросервис, который принимает задачи через REST, сохраняет их в PostgreSQL, публикует в Kafka для обработки, кеширует результаты в Redis и отдает метрики.

## Архитектура

- API (NestJS, TypeScript):
  - POST /tasks → вставка задачи (pending) → публикация в `tasks-input`
  - GET /tasks/:id → сначала Redis (cache-first) → затем БД → запись в кеш
  - GET /metrics → количество выполненных задач и среднее время обработки
- Worker (Kafka consumer):
  - Читает `tasks-input`, переводит статус в processing, переворачивает строку и добавляет длину, обновляет БД (done + result), кеширует полный объект результата, публикует в `tasks-output`
- PostgreSQL: таблица `tasks`
- Redis: ключ `task:result:{taskId}` с TTL 1 час
- Kafka: топики `tasks-input`, `tasks-output`

## Стек

- Node 20, NestJS 11, TypeScript 5
- Drizzle ORM
- PostgreSQL 16
- Redis 7
- Kafka 3.7 (KRaft)
- Docker Compose

## Быстрый старт (Docker)

```bash
# Запуск всех сервисов (API, worker, Postgres, Redis, Kafka, Adminer, RedisInsight, Kafka UI)
docker compose up -d --build

# Применение миграций (из схемы)
docker compose run --rm api npm run drizzle:migrate

# Логи
docker compose logs -f api worker postgres redis kafka
```

### Сервисы и порты

- API: http://localhost:3000
- Postgres: localhost:5432 (user: task, pass: task, db: taskdb)
- Redis: localhost:6379
- Adminer: http://localhost:8080 (System: PostgreSQL, Server: postgres)
- RedisInsight: http://localhost:5540
- Kafka broker: kafka:9092 (внутри сети compose), порт 9092 проброшен наружу
- Kafka UI: http://localhost:8081

## Окружение

Внутри Docker контейнеров уже заданы переменные:

- DATABASE_HOST=postgres, DATABASE_PORT=5432, DATABASE_USER=task, DATABASE_PASSWORD=task, DATABASE_NAME=taskdb
- REDIS_HOST=redis, REDIS_PORT=6379
- KAFKA_BROKERS=kafka:9092

Для запуска вне Docker создайте `.env` с аналогичными значениями (host=localhost).

## База данных

- Конфиг Drizzle: `drizzle.config.ts`
- Схема: `src/db/schema.ts`

Миграции:

```bash
docker compose run --rm api npm run drizzle:generate
docker compose run --rm api npm run drizzle:migrate
```

## API

- POST /tasks
  - Запрос
    ```json
    { "payload": "Hello world!", "priority": 1 }
    ```
  - Ответ
    ```json
    {
      "id": "<uuid>",
      "status": "pending",
      "createdAt": "2025-01-01T00:00:00.000Z"
    }
    ```

- GET /tasks/:id
  - Пример при ожидании (pending)
    ```json
    {
      "id": "<uuid>",
      "payload": "Hello world!",
      "priority": 1,
      "status": "pending",
      "result": null
    }
    ```
  - Пример при завершении (done) — стандартный объект
    ```json
    {
      "taskId": "<uuid>",
      "result": "!dlrow olleH (len=12)",
      "processedAt": "2025-01-01T00:00:02.345Z"
    }
    ```

- GET /metrics
  - Ответ
    ```json
    { "totalTasks": 5, "averageProcessingTimeMs": 1200 }
    ```

## Kafka

- Входной топик: `tasks-input`
  - Сообщение
    ```json
    { "taskId": "<uuid>", "payload": "Hello world!", "priority": 1 }
    ```
- Выходной топик: `tasks-output`
  - Сообщение
    ```json
    {
      "taskId": "<uuid>",
      "result": "!dlrow olleH (len=12)",
      "processedAt": "2025-01-01T00:00:02.345Z"
    }
    ```

## Кэширование

- Ключ: `task:result:{taskId}`
- TTL: 3600 секунд (1 час)
- GET /tasks/:id сначала читает из Redis; если нет — читает из БД и записывает в кеш

## Разработка

Скрипты:

```bash
npm run start:dev          # API (dev)
npm run worker:dev         # Worker (dev)
npm run lint               # ESLint (исправления на сохранение включены)
npm run drizzle:generate   # Генерация миграций из схемы
npm run drizzle:migrate    # Применение миграций
```

## Git workflow

- Ветки: `feat/<scope>`, `fix/<scope>`, `chore/<scope>`, `docs/<scope>`
- Conventional Commits — примеры:
  - `feat(api): implement POST /tasks and GET /tasks/:id`
  - `feat(worker): kafka consumer processes tasks`
  - `chore(devops): add docker compose services`

## Заметки

- Метрики считаются по задачам со статусом `done`.
- В БД в поле `result` хранится только обработанная строка; в Redis — полный объект результата.
