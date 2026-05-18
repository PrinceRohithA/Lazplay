# API Surface

The route inventory is in `configs/api-routes.json`.

Key route groups:

- Auth: `/api/v1/auth/*`
- Games and homepage: `/api/v1/games*`
- Manifests: `/api/v1/games/:gameId/launch-manifest`
- Download orchestration: `/api/v1/games/:gameId/download-session`
- Developer metadata and build registration: `/api/v1/developer/*`
- R2 upload signing: `/api/v1/storage/presign-upload`
- Payments: `/api/v1/payments/*`
- Admin: `/api/v1/admin/*`

The backend intentionally does not include routes that upload, unzip, re-bundle, or stream game assets through Catalyst.
