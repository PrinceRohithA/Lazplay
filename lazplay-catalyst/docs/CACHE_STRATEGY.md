# Cache Strategy

Catalyst Cache is used as the hot metadata layer. It never stores large game files.

## Segments

- `home`: homepage lists, featured games, trending games.
- `metadata`: game details, developer profiles, comments, cosmetics, achievements.
- `manifests`: launcher/runtime manifest payloads.
- `signedUrls`: temporary download and upload session metadata.
- `rateLimit`: per-user, per-IP, and launcher install rate counters.
- `launcher`: launcher session metadata and active manifest hints.

See `iac/cache-segments.json` for exact keys and TTLs.

## TTL Policy

- Homepage and trending: 1 hour.
- Game/developer metadata: 6 hours.
- Manifests: 12 hours.
- Signed URL sessions: 1 hour in Cache, with a stricter `expiresAt` inside the payload.
- Rate limits: 1 hour windows.
- Launcher metadata: 6 hours.

Catalyst Cache uses hour-based expiration and maxes out at 48 hours, so short signed URL lifetimes are enforced in API payloads too.

## Invalidation

Invalidate on:

- Game publish/update.
- Manifest upload or version promotion.
- Purchase completion.
- Comment creation/moderation.
- Admin moderation changes.

Use `POST /internal/cache/invalidate` through API Gateway for explicit invalidation.
