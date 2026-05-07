# LazPlay Backend

This is a runnable backend implementation for the LazPlay game hosting platform.

It currently uses only Node.js built-in modules, so it can run immediately without installing packages. The code is structured around the same API contract in [API_ROUTES.md](./API_ROUTES.md), with mocked local implementations for Razorpay order verification and MinIO signed URLs. Those integration points can later be replaced with official SDKs when the production infrastructure is ready.

## Run

```txt
npm.cmd run start
```

Development mode:

```txt
npm.cmd run dev
```

Smoke test:

```txt
npm.cmd run smoke
```

## Base URL

```txt
http://localhost:3000/api/v1
```

## Seed Accounts

All seed accounts use this password:

```txt
Password123!
```

Accounts:

```txt
player@example.com
dev@example.com
admin@example.com
```

## Important Files

```txt
backend/API_ROUTES.md       Full route documentation
backend/src/app.js          Application, router, handlers, JSON data store
backend/src/server.js       HTTP server entrypoint
backend/data/db.json        Local JSON database, created on first run
backend/scripts/smoke-test.js
```

## Notes

- This is intentionally dependency-free for now.
- Data is persisted to `backend/data/db.json`.
- MinIO routes return signed URL-shaped responses and store metadata locally.
- Razorpay verification uses an HMAC-compatible development flow and can accept `mock_signature` when `ALLOW_MOCK_PAYMENTS=true`.
- WebSocket routes are documented in `API_ROUTES.md`; the current server exposes HTTP endpoints first. Add Socket.IO or NestJS WebSocket gateways when moving to the production NestJS version.
