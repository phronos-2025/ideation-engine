# Runbook — local development

A local Postgres 16 + pgvector container mirrors Neon for a fast loop. No cloud
accounts are needed to run Phase 0 locally.

## Prerequisites

- Node ≥ 20.3, pnpm 10, Docker Desktop.

## Steps

```bash
pnpm install

# 1. Start the local database (Postgres 16 + pgvector)
docker compose up -d
# If the pgvector/pgvector:pg16 pull is slow, any locally-cached image that
# bundles pgvector works for dev. For example, the TimescaleDB image ships
# pgvector and is a fine no-pull substitute:
#   docker run -d --name phronos-db -p 5432:5432 \
#     -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=phronos \
#     timescale/timescaledb:latest-pg15
# (Neon, the production target, is Postgres 16 + pgvector regardless.)

# 2. Point the tools at it (the pooled/unpooled split is a no-op locally)
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/phronos

# 3. Apply migrations (creates extensions, tables, indexes, triggers)
pnpm db:migrate

# 4. Seed the prototype constellation (writes through the action layer)
pnpm db:seed

# 5. Run the API + worker
export API_SERVICE_TOKEN=dev-token
pnpm --filter @phronos/api dev       # API on http://localhost:8080
pnpm --filter @phronos/api worker    # background worker (separate terminal)
```

## Smoke test the API

```bash
curl localhost:8080/healthz
# {"ok":true}

curl -H "x-api-token: dev-token" "localhost:8080/v1/graph" | head -c 400
# {"nodes":[...],"edges":[...]}
```

## Run the action-layer tests

```bash
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/phronos
pnpm --filter @phronos/core test
```

The tests `TRUNCATE` the graph tables between cases, so re-seed afterward
(`pnpm db:seed`) if you want the demo data back.

## Reset the database

```bash
docker compose down -v   # drops the volume; next `up` starts empty
```
