# Railway image for the action-layer API and the pg-boss worker.
# Both Railway services build this same image; the worker service overrides the
# start command to `pnpm --filter @phronos/api worker`.
FROM node:20-slim

# pnpm via corepack (version pinned by package.json "packageManager").
RUN corepack enable
WORKDIR /app

# Copy the whole monorepo and install. --prod=false keeps devDeps (tsx) so the
# tsx entrypoints run. (A later optimization is to compile with tsup and run
# node, dropping tsx from the runtime image.)
COPY . .
RUN pnpm install --frozen-lockfile --prod=false

# The API reads PORT (Railway injects it); defaults to 8080 locally.
EXPOSE 8080
CMD ["pnpm", "--filter", "@phronos/api", "start"]
