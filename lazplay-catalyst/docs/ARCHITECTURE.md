# Architecture

## Runtime Split

Frontend:

- Source lives in `frontend/`.
- `scripts/build.ps1` builds Vite output into `client/dist/`.
- `client/dist/client-package.json` sets `index.html` as homepage and `404.html` as the SPA fallback.

Backend:

- AppSail service name: `lazplay-api`.
- Entrypoint: `backend/src/catalyst/server.js`.
- Runtime: Node 20.
- API Gateway routes `/api/v1/{path1:(.*)}` to the AppSail service root.

Functions:

- `functions/cacheInvalidator` exists for targeted cache invalidation through `/internal/cache/invalidate`.

Data:

- Catalyst Data Store stores users, developers, games, versions, manifests, purchases, cosmetics, achievements, comments, reports, admin logs, launcher sessions, and analytics events.
- `iac/datastore.schema.json` is the authoritative schema manifest.
- `iac/external-postgres-fallback.sql` is included only if Data Store limits become painful.

Storage:

- Cloudflare R2 remains primary binary/object storage.
- Catalyst never reads large game objects or streams downloads.
- AppSail signs R2 `GET` and `PUT` URLs with short TTLs.

## Important Boundaries

- No launcher logic was changed.
- No Cloudflare R2 architecture was replaced.
- No heavy ZIP or binary processing belongs in Catalyst.
- Old generated files under this directory are excluded from AppSail deployment through `catalyst.json` ignore rules.
