# Runbook — first deploy (Neon · Railway · Vercel · Cloudflare Access)

Closes Phase 0's last criterion: the app is live behind a one-identity edge gate.
Order matters — each step produces a value the next one needs.

```
Browser → Cloudflare Access (allowlist) → Vercel (Astro + proxy)
        → Railway (API + worker) → Neon (Postgres + pgvector)
```

Secrets live server-side only (Railway + Vercel env), never in the client bundle.

---

## 1. Neon — database

1. Create a project (Postgres 16, region near you). Name it `phronos`.
2. Neon ships `pgvector`; our migration runs `CREATE EXTENSION vector` — no extra
   step.
3. Copy two connection strings from the dashboard:
   - **Pooled** (has `-pooler` in the host) → `DATABASE_URL`
   - **Direct/unpooled** → `DATABASE_URL_UNPOOLED` (migrations + seed)
4. From your machine, apply schema + seed against Neon (you run this — it uses
   your DB credentials):
   ```bash
   DATABASE_URL_UNPOOLED="<neon-direct>" pnpm db:migrate
   DATABASE_URL="<neon-direct>" pnpm db:seed
   ```
   Expect `Applied 1 migration(s).` then `Seeded 42 nodes, 40 parent edges, 6
   cross edges.`

## 2. Railway — API + worker

Railway builds the repo `Dockerfile`. Create **two services** from
`phronos-2025/ideation-engine`:

**Service `api`** (default Dockerfile CMD)
- Variables:
  - `DATABASE_URL` = Neon **pooled** string
  - `API_SERVICE_TOKEN` = a fresh secret (`openssl rand -hex 32`)
  - `ALLOWED_IDENTITY` = your email
- Generate a public domain → this URL is `API_BASE_URL` for Vercel.

**Service `worker`** (same repo/Dockerfile)
- Override the start command: `pnpm --filter @phronos/api worker`
- Variable: `DATABASE_URL` = Neon **pooled** string. No public domain.

Check the api service logs for `Phronos API listening on :8080` and the worker for
`Phronos worker started (pg-boss).`

## 3. Vercel — front end

1. Import `phronos-2025/ideation-engine`. **Root Directory = `apps/web`**
   (framework auto-detects as Astro; pnpm workspace install is handled).
2. Environment variables:
   - `API_BASE_URL` = the Railway `api` public URL
   - `API_SERVICE_TOKEN` = the **same** secret as Railway
   - `ALLOWED_IDENTITY` = your email
3. Deploy → note the `*.vercel.app` URL and confirm the graph loads (it's reading
   Neon through Railway).

## 4. Cloudflare — DNS move + Access edge gate

**Move the domain (DNS is currently elsewhere):**
1. Add the site `phronos.org` to Cloudflare → it shows two nameservers.
2. At your current registrar, replace the nameservers with Cloudflare's; wait for
   activation.
3. Set SSL/TLS mode to **Full (strict)**.

**Point the domain at Vercel:**
4. In Vercel, add `phronos.org` as a custom domain (follow its verification).
5. In Cloudflare DNS, add the record Vercel specifies (a proxied **CNAME** to
   `cname.vercel-dns.com`), orange-cloud ON.

**Edge gate (Zero Trust → Access):**
6. Add an identity provider (Google or GitHub) — one-time.
7. Add an **Access application** (Self-hosted) for `phronos.org`.
8. Policy: **Allow**, rule `Emails == <your email>`. Everyone else is denied.
9. Access injects `Cf-Access-Authenticated-User-Email` to the origin; our Vercel
   proxy already reads it for `event.actor_id`.

## 5. Verify (acceptance)

- Visit `https://phronos.org` in a clean browser → Cloudflare Access login →
  only the allowlisted email gets in → the graph loads.
- An incognito session with a different identity is **denied at the edge**.
- Create/edit a node; confirm a new `event` row in Neon stamped with your
  identity-derived `actor_id`.

## Deferred hardening (ADR 0002)

The API currently trusts the service token + forwarded `x-actor-email`. As
defense-in-depth, verify the raw `Cf-Access-Jwt-Assertion` against the team JWKS
at the API. Track for a follow-up; the single-identity allowlist is the perimeter.

## Phase 1/2 secrets (add when those phases land)

`ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` (Railway), and `ZOTERO_API_KEY` /
`ZOTERO_LIBRARY_ID` / `ZOTERO_LIBRARY_TYPE` (Railway).
