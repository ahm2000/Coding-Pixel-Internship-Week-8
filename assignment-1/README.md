# Assignment 1 — NestJS fundamentals drills

One feature module wired top to bottom — controller, service, repository —
over the same fixed Task Management schema from Weeks 5-7, through NestJS
instead of raw TypeORM scripts.

## Run it

```
npm install
cp .env.example .env   # fill in DB_HOST/PORT/USERNAME/PASSWORD/NAME, PORT
npm run start           # boots against the .env database
npm test                 # unit tests, no database required
```

This assignment reuses the Phase 3 database and entities — it does not
create a new schema, and `synchronize` stays `false`. No migrations are
committed here: the target database already needs the 7-table schema from
Week 6 Assignment 1's `InitialSchema` + `AddTaskIndexes` migrations (not
`MakeTaskDescriptionRequired` — see the note below on `Task.description`).

## Verified

Each item below reflects an actual run, not an expectation of what the
code should do.

**W1** — the app boots (`npm run start`) against a real Postgres 18
database read from `.env` via `ConfigModule`. `grep -rn` over `src` for
the host, password, or database name finds zero literal credentials —
only the string `'postgres'` (the TypeORM driver name) and the
`ProjectRole.ADMIN = 'admin'` enum value, neither a credential.
`synchronize: false` in `TypeOrmModule.forRootAsync`.

**W2** — `TasksModule` registers `Task` via `TypeOrmModule.forFeature`
and injects its repository into `TasksService` with
`@InjectRepository(Task)`. Verified live: commenting out the
`forFeature` import and re-running `npm run start` fails to boot with
`Nest can't resolve dependencies of the TasksService (?, ClockService)...
"TaskRepository" ... is available in the TasksModule context` — restored
after.

**C1** — `GET /health/db` counts the `tasks` table through
`TasksController → TasksService → Repository<Task>`. `curl` against a
running instance returns `{"count":0,"asOf":"..."}` against the empty
`Week_8` database. `grep -n "Repository" src/tasks/tasks.controller.ts`
finds nothing — the controller only calls `tasksService.getDbHealth()`.

**C2** — `tasks.service.spec.ts` mocks the repository via
`{ provide: getRepositoryToken(Task), useValue: { count: jest.fn() } }`.
`npm test` passes with the database not running; the test asserts
`tasksRepository.count` was called and the returned count is wired
through.

**C3** — `TasksService` takes a second provider, `ClockService`
(`src/clock/`), alongside the repository — used for the `asOf` timestamp
on the health response. A second unit test replaces `ClockService` with a
`{ now: jest.fn() }` mock and asserts the response uses whatever the mock
returns, with no change to `TasksService` itself.

## Challenge

**X1** — `ConfigModule.forRoot({ validationSchema })` validates every env
var with Joi (`src/config/env.validation.ts`). Verified live: deleting
`DB_PASSWORD` from `.env` and running `npm run start` fails immediately
with `Config validation error: "DB_PASSWORD" is required` — before any
database connection is attempted. Restored after.

**X2** — `PingModule`/`PongModule` (`src/ping/`, `src/pong/`) are a small,
self-contained pair built only for this drill — `PingService` and
`PongService` each inject the other. Verified live: removing
`forwardRef(() => ...)` from both the module `imports` and the service
`@Inject` decorators makes `npm run start` fail with `Nest cannot create
the PongModule instance. The module at index [0] of the PongModule
"imports" array is undefined ... A circular dependency between modules.
Use forwardRef() to avoid it.` Adding `forwardRef` back on both sides
fixes it; `GET /ping` then returns
`{"ping":"ping -> pong","pong":"pong -> ping"}`.
In a real codebase extracting a small shared module (e.g. a common
`identify()` service both depend on) would be the better answer —
`forwardRef` is worth reaching for only when two services genuinely need
a live reference to each other at runtime, which `Ping`/`Pong` only do
because that's the point of the exercise.

**X3** — `ClockModule` provides `ClockService` and exports it;
`TasksModule` imports `ClockModule` and injects `ClockService` into
`TasksService` purely because it's exported. Verified live: removing the
`exports: [ClockService]` line (keeping it in `providers`) makes
`npm run start` fail with `Nest can't resolve dependencies of the
TasksService (TaskRepository, ?) ... ClockService ... is available in the
TasksModule context` — restored after.

## A note on `Task.description`

Week 6 Assignment 1's Challenge X3 made `tasks.description` `NOT NULL` as
an assignment-specific change. This week's own schema table lists
`description` with no `NOT NULL`, matching the original fixed domain, so
the entity here (`src/entities/Task.ts`) keeps it nullable
(`description!: string | null`) and the `Week_8` database was built from
Week 6's `InitialSchema` + `AddTaskIndexes` migrations only — not the
`NOT NULL` one.

## Where things are

- `src/entities/` — the 6 reused Phase 3 entities (copied from Week 6
  Assignment 1, `Task.description` reverted to nullable — see above).
- `src/config/env.validation.ts` — the Joi schema for X1.
- `src/tasks/` — the required feature module: controller, service,
  repository injection, unit test.
- `src/clock/` — the second provider for C3, exported for X3.
- `src/ping/`, `src/pong/` — the X2 circular-dependency drill, kept
  separate from the graded feature module.
- `src/app.module.ts` — `ConfigModule` + `TypeOrmModule.forRootAsync` +
  every feature module.
