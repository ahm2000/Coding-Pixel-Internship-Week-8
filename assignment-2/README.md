# Assignment 2 — Tasks API (CRUD, main build)

A NestJS REST API over the reused Phase 3 Task Management database —
five endpoints, all under `/tasks`.

## Run it

```
npm install
cp .env.example .env   # fill in DB_HOST/PORT/USERNAME/PASSWORD/NAME, PORT
npm run start
npm test                 # two integration tests + three error-path tests, against a real database
```

`synchronize` stays `false`; this reuses the same `Week_8` database and
entities as Assignment 1 (`Task.description` nullable — see that
assignment's README for why).

## Endpoints

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| `POST` | `/tasks` | `CreateTaskDto` | `201` → created task | `400` (validation), `404` (`projectId`/`assigneeId`/`tagIds` not found) |
| `GET` | `/tasks` | — (query: `status?`, `projectId?`, `assigneeId?`, `page?`, `pageSize?`) | `200` → `{ items, total, page }` | `400` (bad query type) |
| `GET` | `/tasks/:id` | — | `200` → task with `project`, `assignee`, `tags` loaded | `404` |
| `PATCH` | `/tasks/:id` | `UpdateTaskDto` (any subset) | `200` → updated task | `400`, `404` |
| `DELETE` | `/tasks/:id` | — | `204` No Content | `404` |

Every error response has the same shape (`AllExceptionsFilter`):
`{ statusCode, message, path, timestamp }`.

**`CreateTaskDto`**: `title` (`string`, ≥3 chars, required), `description?`
(`string`), `status?` (`TaskStatus` enum, defaults to `todo`), `priority?`
(`int`, 1–5, defaults to `3`), `projectId` (`int`, required), `assigneeId?`
(`int`), `tagIds?` (`int[]`). `UpdateTaskDto` is
`PartialType(CreateTaskDto)` — every field optional, same rules.

## Verified

Each item below reflects an actual `curl`/`npm test` run, not an
expectation of what the code should do.

**W1** — `UsersModule`, `ProjectsModule`, `TasksModule` each register their
entity with `TypeOrmModule.forFeature`. The global `ValidationPipe`
(`{ whitelist: true, forbidNonWhitelisted: true, transform: true }`) is
set in `main.ts`. Verified live: `POST /tasks` with an unknown field
(`{"title":"Valid title","projectId":3,"nope":"field"}`) returns `400`.
`{"priority":"2"}` (a JSON *string*) arrives in the entity as the number
`2` — this needed `@Type(() => Number)` on the numeric DTO fields in
addition to `transform: true`; without it, `transform: true` alone left
`"2"` a string and `@IsInt()` correctly rejected it with `400` — a real
bug caught by actually sending a string, not by reading the pipe options
and assuming they were enough.

**W2** — `POST /tasks` returns `201` with the created task. `GET
/tasks/:id` on a real id returns `project`, `assignee`, and `tags` all
populated (not just the FK ids) — `relations: { project: true, assignee:
true, tags: true }` on the repository call. An unknown id returns `404`
with a message naming the id, not `500` or an empty body.

**C1** — `title: "ab"`, `priority: 9`, `status: "nope"` in one request
returns `400` with three field-specific messages
(`"title must be longer than or equal to 3 characters"`, `"status must be
one of the following values: todo, in_progress, done"`, `"priority must
not be greater than 5"`). A `PATCH` with one field changes only that
field. `grep -rn "\bany\b" src` finds nothing.

**C2** — `?status=todo&projectId=3` returns only tasks matching both,
built with `andWhere` per present filter and named parameters
(`:status`, `:projectId`) — never string-concatenated SQL. No filter
returns the full list. An absent filter is simply never added to the
query, so it can't become `WHERE status = 'undefined'`.

**C3** — `PATCH /tasks/:id` with `{"status":"in_progress"}` changed only
`status`, every other field (`title`, `priority`, `project`, `assignee`)
unchanged. `DELETE /tasks/:id` returns `204` with an empty body; deleting
the same id again returns `404`.

**C4** — `POST /tasks` with `projectId: 9999` (no such project) returns
`404` with `"Project 9999 not found"` — checked in the service before
`save()`, never reaches Postgres as a foreign-key violation. Same pattern
for `assigneeId` and each id in `tagIds`.

**C5** — `grep -n "Repository\|DataSource" src/tasks/tasks.controller.ts`
finds nothing. Every controller method is one call into `TasksService`
plus a return.

**C6** — `tasks.integration.spec.ts`: a happy-path test (`POST` then `GET`
the same task back, asserting the title and the loaded `project`) and a
validation-failure test (`title: "ab"` → `400`, message mentions
`"title"`). Both run under `npm test`, which spins up the real app via
`Test.createTestingModule({ imports: [AppModule] })` against the actual
`Week_8` database — a genuine integration test, not a mocked one.

## Challenge

**X1** — `GET /tasks?projectId=3&page=1&pageSize=5` and `...&page=2` on 7
seeded tasks: page 1 returned ids `[5,6,7,8,9]`, page 2 returned
`[10,11]`, both reporting `"total":7` — verified live, not assumed.
Pagination combines with the filters (`skip`/`take` added to the same
query builder that has the `andWhere` filters on it). `pageSize` is
clamped to a maximum of 100.

**X2** — `AllExceptionsFilter` (`src/common/`) is the single `@Catch()`
registered in `main.ts`. Verified live: a `400` (validation) and a `404`
(missing task) both return the same four fields (`statusCode`, `message`,
`path`, `timestamp`). For a genuine, non-`HttpException` 500: `GET
/tasks/99999999999` overflows Postgres's `integer` column and raises a
raw `QueryFailedError` — the response was
`{"statusCode":500,"message":"Internal server error","path":"/tasks/99999999999","timestamp":"..."}`,
same four fields, no Postgres error text and no stack trace reaching the
client.

**X3** — three more tests: unknown id → `404` (asserts `path` and
`timestamp` are present too), an unknown extra field → `400`, and a
delete → `204` then a second delete on the same id → `404`. Each test
creates the rows it needs (`beforeAll` inserts one `User` + `Project`
through the injected repositories) rather than depending on seed data,
and `afterAll` deletes them — `npm test` run twice in a row both times
passed all 5 tests with no manual database reset.

## Where things are

- `src/entities/` — the 6 reused Phase 3 entities (same as Assignment 1).
- `src/tasks/dto/` — `CreateTaskDto`, `UpdateTaskDto`, `TaskFilterDto`.
- `src/tasks/` — the required feature module: controller, service,
  the integration test suite.
- `src/users/`, `src/projects/` — minimal modules registering their
  repositories, consumed by `TasksService` for the C4 existence checks.
- `src/common/all-exceptions.filter.ts` — the X2 global exception filter.
- `src/app.module.ts` — `ConfigModule` + `TypeOrmModule.forRootAsync` +
  every feature module.
- `src/main.ts` — the global `ValidationPipe` and exception filter.
