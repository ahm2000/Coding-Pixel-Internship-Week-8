# Assignment 3 — Projects & Comments CRUD + unit tests

Two more resources on the same NestJS API — full CRUD for `Projects`, a
task-scoped child resource for `Comments` — plus unit tests that prove
the service logic without a REST client.

## Run it

```
npm install
cp .env.example .env   # fill in DB_HOST/PORT/USERNAME/PASSWORD/NAME, PORT
npm run start
npm test                 # 5 mocked-repository unit tests, 1 real-DB cascade test
```

Same `Week_8` database and entities as Assignments 1-2.

## Endpoints

| Method | Path | Body | Success | Errors |
|---|---|---|---|---|
| `POST` | `/projects` | `CreateProjectDto` | `201` | `400`, `404` (`ownerId` not found) |
| `GET` | `/projects` | — | `200` → `Project[]` | — |
| `GET` | `/projects/:id` | — | `200` → project with `owner` loaded | `404` |
| `PATCH` | `/projects/:id` | `UpdateProjectDto` | `200` | `400`, `404` |
| `DELETE` | `/projects/:id` | — | `204` | `404` |
| `POST` | `/tasks/:taskId/comments` | `CreateCommentDto` | `201` | `400`, `404` (task or `authorId` not found) |
| `GET` | `/tasks/:taskId/comments` | — (query: `page?`, `pageSize?`) | `200` → `{ items, total, page }` | `404` (task not found) |

`CreateProjectDto`: `name` (`string`, non-empty, required), `ownerId`
(`int`, required). `CreateCommentDto`: `body` (`string`, non-empty,
required), `authorId` (`int`, required) — the task id always comes from
the route, never the body.

`GET /tasks/:id` (from Assignment 2) now also returns `commentCount`.

## Verified

Each item below reflects an actual `curl`/`npm test` run.

**W1** — full `Projects` CRUD, same status codes as `Tasks`: `POST`
`201`, `DELETE` `204`, unknown id `404` (`GET /projects/999999` →
`{"statusCode":404,"message":"Project 999999 not found",...}`), an empty
`name` → `400` with `"name should not be empty"`.

**W2** — `POST /tasks/16/comments` stores the comment against task `16`
(the id in the path); `GET /tasks/16/comments` returns only that task's
3 comments, not comments from any other task.

**C1** — `POST /tasks/999999/comments` returns `404` with `"Task 999999
not found"` and (verified in the unit test, not just live) never calls
`commentsRepository.create`/`save` — no dangling row. `{"body":""}` →
`400` with `"body should not be empty"`.

**C2** — seeded a project → task → comment, deleted the project through
`ProjectsService.remove`, then queried all three repositories directly:
the task, the comment, and the project were all gone. This is Postgres's
own `ON DELETE CASCADE` on `tasks.project_id` and `comments.task_id`
(already in the schema since Week 6) doing the work — the service just
calls `repository.delete(id)` and lets the database honour its own FK
rules, rather than the service walking the tree and deleting rows
itself. Proven by `projects-cascade.integration.spec.ts`, a real-database
test, not a manual query.

**C3** — `comments.service.spec.ts`, three tests, all repositories
mocked, no database running: a successful `addComment` (asserts
`commentsRepository.create` was called with the resolved `task`/`author`
and the saved comment is returned), a 404 path (`addComment(999, dto)`
rejects with `NotFoundException`, and `create`/`save` were never called),
and a list case (`findByTask` asserts `findAndCount` was called with
`where: { task: { id: 1 } }`, proving the scoping, and returns the
`{ items, total, page }` shape).

**C4** — `grep -n "Repository\|DataSource"` on both new controllers
finds nothing; `grep -rn "\bany\b" src` finds nothing.

## Challenge

**X1** — `tasks.service.spec.ts`: the mocked query builder's
`getRawAndEntities()` returns `raw: [{ commentCount: '5' }]` — a
*string*, matching what Postgres's `COUNT(*)` actually returns. The test
asserts `result.commentCount === 5` **and** `typeof result.commentCount
=== 'number'`. What this mock could lie about: a mock that returned
`commentCount: 5` already as a number would pass even if the service
forgot the `Number(...)` conversion on the real raw string, since a
`toBe` check against a same-looking value can't tell `"5"` from `5` by
itself — using the string form is what actually forces that conversion
line to run.

**X2** — `GET /tasks/:id` carries `commentCount` (verified live: `0` on
a fresh task, `3` after adding 3 comments) without `leftJoinAndSelect`ing
`comments` at all — `TasksService.findOne` adds a correlated `COUNT(*)`
subquery (`.addSelect((qb) => qb.select('COUNT(*)', 'count').from(Comment,
'comment').where('comment.task_id = task.id'), 'commentCount')`) and
merges it via `getRawAndEntities()`. Not `loadRelationCountAndMap` —
checked `node_modules/typeorm` directly and it doesn't exist in this
TypeORM version (same divergence Week 6's `NOTES.md` already documented).

**X3** — `GET /tasks/16/comments?page=1&pageSize=3` then `?page=2` on 6
seeded comments: page 1 returned comments `1-3`, page 2 returned exactly
`4-6`, both reporting `"total":6` — verified live. The shape
(`{ items, total, page }`) and the pagination math (`src/common/
pagination.ts`'s `resolvePagination`) are the *same code* `TasksService`
uses for `GET /tasks`, not a copy — `TaskFilterDto` now extends the same
`PaginationQueryDto` the comments endpoint uses directly.

## Where things are

- `src/projects/` — `ProjectsController`, `ProjectsService`, DTOs, and
  `projects-cascade.integration.spec.ts` (C2).
- `src/comments/` — `CommentsController` (mounted at
  `tasks/:taskId/comments`), `CommentsService`, DTOs, and
  `comments.service.spec.ts` (C3).
- `src/tasks/tasks.service.ts` — `findOne` now carries the X2 comment
  count; `tasks.service.spec.ts` has the X1 mapping test.
- `src/common/pagination.ts` — `resolvePagination`/`Paginated<T>`, shared
  by `Tasks` and `Comments` (X3).
- `src/common/pagination-query.dto.ts` — the `page`/`pageSize` validation
  both `TaskFilterDto` and the comments endpoint reuse.
- `src/entities/Task.ts` — added an undecorated `commentCount?: number`
  field (not a column) for X2's query-builder mapping.
