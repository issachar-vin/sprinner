# Sprinner

A sprint planning board: sprints are columns, each ticket owns a row, and tickets stretch across
the columns they'll take to finish. Sprint headers show how much capacity the team actually has and
how much of it is already spent.

It's a **roadmap grid**, not a kanban board. Desktop-only, single board, single user, no backend —
state lives in `localStorage` and travels as a JSON file.

## Quick start

Everything runs in Docker; nothing but Docker and `make` is needed on the host.

```bash
make setup   # build the dev image
make dev     # http://localhost:5173, hot reload
```

| Command          | What it does                                       |
| ---------------- | -------------------------------------------------- |
| `make dev`       | Dev server with hot reload on :5173                |
| `make prod`      | Production bundle behind nginx on :8080            |
| `make ghcr`      | Run the published image from GHCR                  |
| `make check`     | Lint, typecheck and tests                          |
| `make test`      | Unit tests                                         |
| `make shell`     | Shell inside the dev container                     |
| `make clean`     | Tear down containers, volumes and build output     |

Ports are overridable: `make dev DEV_PORT=3000`.

## Releases

Merging to `main` builds a multi-arch image and publishes it to GHCR tagged with the `package.json`
version — nothing else, no `latest`. **Every PR must bump the version**; CI fails the PR if it
doesn't, because the release job would otherwise try to republish an existing tag.

```bash
docker compose -f docker-compose.ghcr.yml up          # current version
SPRINNER_VERSION=0.2.0 docker compose -f docker-compose.ghcr.yml up
```

## Documentation

- [docs/spec.md](docs/spec.md) — the authoritative spec: data model, capacity maths, blocked-by
  rules, phase plan
- [docs/overview.md](docs/overview.md) — the original brief
- [docs/answers.md](docs/answers.md) — decisions that resolved the brief's ambiguities

## Stack

Vite · React · TypeScript · CSS Grid for the board · Zustand + persist · zod for validation at the
import/rehydrate boundary · Vitest.
