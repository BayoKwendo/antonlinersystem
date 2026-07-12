# syntax=docker/dockerfile:1
# =============================================================================
#  waterdril_back — Deno + Oak API server. Production image.
#  Build context = waterdril_back/. Secrets (.env, secrets/) are NOT baked in;
#  they are injected at runtime via env_file + a mounted volume (see compose).
# =============================================================================
FROM denoland/deno:2.1.4

WORKDIR /app

# --- dependency cache layer (rebuilds only when deps change) ------------------
# deps.ts re-exports every JSR + npm dependency; caching it warms DENO_DIR.
COPY deno.json deno.lock deps.ts ./
RUN deno cache deps.ts

# --- application code ---------------------------------------------------------
COPY . .
RUN deno cache server.ts

# Drop root for runtime.
USER deno

EXPOSE 5002

# Liveness: the health route (GET /) runs a `SELECT 1`, so this also proves DB reachability.
HEALTHCHECK --interval=30s --timeout=5s --retries=5 --start-period=20s \
  CMD ["deno", "eval", "--allow-net", "const r = await fetch('http://localhost:5002/').catch(() => null); Deno.exit(r && r.ok ? 0 : 1)"]

# Flags mirror deno.json's `start` task. No --allow-write: the app never writes to disk.
CMD ["run", "--allow-net", "--allow-env", "--allow-read", "--allow-sys", "server.ts"]
