# LazPlay Backend API Route Documentation

This document is the backend route contract for LazPlay, a web-based game hosting platform with:

- React/Vite frontend
- Self-hosted backend server
- PostgreSQL database
- MinIO object storage
- Razorpay payments
- Realtime deployment and game instance logs

Recommended backend framework: **NestJS with TypeScript**.

Recommended backend stack:

- API framework: NestJS
- ORM: Prisma
- Database: PostgreSQL
- Cache/queues: Redis + BullMQ
- Storage: MinIO using S3-compatible APIs
- Payments: Razorpay Node SDK
- Realtime: NestJS WebSocket Gateway
- Auth: JWT access tokens + refresh tokens
- Deployment/runtime: Docker or container orchestrator

Base URL:

```txt
https://api.lazplay.example.com/api/v1
```

Local development URL:

```txt
http://localhost:3000/api/v1
```

Common headers:

```http
Content-Type: application/json
Authorization: Bearer <accessToken>
```

Common error response:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      {
        "field": "email",
        "message": "Email must be valid"
      }
    ]
  },
  "requestId": "req_01JZABC123"
}
```

Common pagination response shape:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

Roles:

- `PLAYER`: Can browse, buy, launch, review, wishlist, and manage library.
- `DEVELOPER`: Can create games, upload builds, deploy, view analytics, and view revenue.
- `ADMIN`: Can moderate users, games, payments, deployments, servers, and audit logs.

---

## 1. System Routes

### GET /health

Description: Checks API, database, Redis, MinIO, and queue health.

Auth: Public.

Request:

```http
GET /api/v1/health
```

Response:

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "api": "ok",
    "database": "ok",
    "redis": "ok",
    "minio": "ok",
    "queue": "ok",
    "timestamp": "2026-05-07T16:00:00.000Z"
  }
}
```

### GET /version

Description: Returns backend app version and build metadata.

Auth: Public.

Response:

```json
{
  "success": true,
  "data": {
    "name": "lazplay-backend",
    "version": "1.0.0",
    "commit": "a1b2c3d",
    "environment": "production"
  }
}
```

---

## 2. Auth Routes

### POST /auth/register

Description: Creates a new player account. Developer status can be requested later.

Auth: Public.

Request body:

```json
{
  "username": "neon_runner",
  "email": "runner@example.com",
  "password": "StrongPassword123!",
  "displayName": "Neon Runner"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_01JZ001",
      "username": "neon_runner",
      "email": "runner@example.com",
      "displayName": "Neon Runner",
      "roles": ["PLAYER"]
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

### POST /auth/login

Description: Authenticates a user and returns tokens.

Auth: Public.

Request body:

```json
{
  "identifier": "runner@example.com",
  "password": "StrongPassword123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr_01JZ001",
      "username": "neon_runner",
      "displayName": "Neon Runner",
      "roles": ["PLAYER", "DEVELOPER"]
    },
    "accessToken": "jwt_access_token",
    "refreshToken": "jwt_refresh_token"
  }
}
```

### POST /auth/refresh

Description: Rotates refresh token and issues a fresh access token.

Auth: Public.

Request body:

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "accessToken": "new_jwt_access_token",
    "refreshToken": "new_jwt_refresh_token"
  }
}
```

### POST /auth/logout

Description: Revokes the current refresh token/session.

Auth: User.

Request body:

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "loggedOut": true
  }
}
```

### POST /auth/forgot-password

Description: Starts password reset flow.

Auth: Public.

Request body:

```json
{
  "email": "runner@example.com"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "message": "If the email exists, a reset link has been sent"
  }
}
```

### POST /auth/reset-password

Description: Resets password using a reset token.

Auth: Public.

Request body:

```json
{
  "token": "password_reset_token",
  "newPassword": "NewStrongPassword123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "passwordUpdated": true
  }
}
```

### GET /auth/me

Description: Returns the currently authenticated user.

Auth: User.

Response:

```json
{
  "success": true,
  "data": {
    "id": "usr_01JZ001",
    "username": "neon_runner",
    "email": "runner@example.com",
    "displayName": "Neon Runner",
    "avatarUrl": "https://cdn.lazplay.example.com/avatars/usr_01JZ001.png",
    "roles": ["PLAYER"],
    "createdAt": "2026-05-07T10:00:00.000Z"
  }
}
```

---

## 3. User Routes

### PATCH /users/me

Description: Updates the current user's public profile.

Auth: User.

Request body:

```json
{
  "displayName": "Neon Runner X",
  "bio": "Arcade racer and server host.",
  "avatarObjectKey": "avatars/usr_01JZ001.png"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "usr_01JZ001",
    "displayName": "Neon Runner X",
    "bio": "Arcade racer and server host.",
    "avatarUrl": "https://cdn.lazplay.example.com/avatars/usr_01JZ001.png"
  }
}
```

### PATCH /users/me/password

Description: Changes the current user's password.

Auth: User.

Request body:

```json
{
  "currentPassword": "StrongPassword123!",
  "newPassword": "NewStrongPassword123!"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "passwordChanged": true
  }
}
```

---

## 4. Public Game Catalog Routes

### GET /games

Description: Lists public games with filters for catalog and discovery pages.

Auth: Optional.

Query parameters:

```txt
page=1
limit=20
search=neon
genre=action
tags=multiplayer,cyberpunk
platform=pc
priceType=paid
sort=featured
status=published
```

Example request:

```http
GET /api/v1/games?page=1&limit=12&search=neon&sort=featured
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "game_01JZ100",
      "slug": "neon-void-overdrive",
      "title": "Neon Void: Overdrive",
      "price": 2499,
      "currency": "INR",
      "priceType": "PAID",
      "coverUrl": "https://cdn.lazplay.example.com/games/neon-cover.jpg",
      "developer": {
        "id": "dev_01JZ900",
        "displayName": "Neon Labs"
      },
      "genres": ["Action"],
      "tags": ["Multiplayer", "Cyberpunk"],
      "rating": 4.8,
      "publishedAt": "2026-05-01T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 1,
    "totalPages": 1
  }
}
```

### GET /games/featured

Description: Returns games for homepage hero carousel and featured rows.

Auth: Optional.

Query parameters:

```txt
limit=6
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "game_01JZ100",
      "slug": "neon-drifter-84",
      "title": "Neon Drifter 84",
      "heroImageUrl": "https://cdn.lazplay.example.com/games/neon-drifter-hero.jpg",
      "tagline": "High-speed synthwave racing protocol.",
      "isOwned": false
    }
  ]
}
```

### GET /games/:gameId

Description: Returns full game details page data.

Auth: Optional.

Path parameters:

```txt
gameId = game id or slug
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "game_01JZ100",
    "slug": "cyber-quest",
    "title": "Cyber Quest",
    "description": "A high-octane run-and-gun adventure through neon sectors.",
    "price": 49900,
    "currency": "INR",
    "priceType": "PAID",
    "licensingModel": "PREMIUM",
    "releaseDate": "2026-05-01",
    "developer": {
      "id": "dev_01JZ900",
      "displayName": "Neon Labs"
    },
    "publisher": "Neon Labs",
    "genres": ["Platformer", "Action"],
    "tags": ["Cyberpunk", "Multiplayer", "Permadeath"],
    "platforms": ["PC", "CONSOLE", "VR", "CLOUD"],
    "hardwareSpecs": ["PC_SYSTEM", "CLOUD_RELAY"],
    "coverUrl": "https://cdn.lazplay.example.com/games/cyber-cover.jpg",
    "heroBannerUrl": "https://cdn.lazplay.example.com/games/cyber-hero.jpg",
    "trailerUrl": "https://cdn.lazplay.example.com/games/cyber-trailer.mp4",
    "screenshots": [
      "https://cdn.lazplay.example.com/games/cyber-1.jpg",
      "https://cdn.lazplay.example.com/games/cyber-2.jpg"
    ],
    "binaries": {
      "windows": "https://cdn.lazplay.example.com/builds/game_01JZ100/v1.0.4/win64.zip",
      "webgl": "https://cdn.lazplay.example.com/builds/game_01JZ100/v1.0.4/webgl.zip"
    },
    "systemRequirements": {
      "minimum": {
        "cpu": "Intel Core i5-6600K",
        "memory": "8 GB RAM",
        "gpu": "NVIDIA GTX 1060 6GB / AMD RX 580",
        "storage": "50 GB (SSD Preferred)"
      },
      "recommended": {
        "cpu": "Intel Core i7-9700K / AMD Ryzen 7 3700X",
        "memory": "16 GB RAM",
        "gpu": "NVIDIA RTX 2070 Super / AMD RX 5700 XT",
        "storage": "50 GB (NVMe SSD Required)"
      }
    },
    "isOwned": true,
    "isWishlisted": false,
    "rating": 4.7,
    "reviewCount": 128
  }
}
```

### GET /games/:gameId/media

Description: Returns media gallery for the game.

Auth: Optional.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "media_01",
      "type": "IMAGE",
      "url": "https://cdn.lazplay.example.com/games/cyber-1.jpg",
      "alt": "Cyber Quest screenshot",
      "sortOrder": 1
    },
    {
      "id": "media_02",
      "type": "VIDEO",
      "url": "https://cdn.lazplay.example.com/games/cyber-trailer.mp4",
      "alt": "Cyber Quest trailer",
      "sortOrder": 2
    }
  ]
}
```

### GET /games/:gameId/reviews

Description: Lists reviews for a game.

Auth: Optional.

Query parameters:

```txt
page=1
limit=20
sort=recent
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "rev_01JZ001",
      "rating": 5,
      "body": "Runs perfectly on my hosted instance.",
      "author": {
        "id": "usr_01JZ001",
        "displayName": "Neon Runner"
      },
      "createdAt": "2026-05-07T12:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### POST /games/:gameId/reviews

Description: Creates or updates the authenticated user's review. User must own the game.

Auth: Player.

Request body:

```json
{
  "rating": 5,
  "body": "Great multiplayer hosting performance."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "rev_01JZ001",
    "gameId": "game_01JZ100",
    "rating": 5,
    "body": "Great multiplayer hosting performance.",
    "createdAt": "2026-05-07T12:00:00.000Z"
  }
}
```

### GET /genres

Description: Lists available game genres.

Auth: Optional.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "genre_action",
      "name": "Action",
      "slug": "action"
    }
  ]
}
```

### GET /tags

Description: Lists available game tags.

Auth: Optional.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "tag_multiplayer",
      "name": "Multiplayer",
      "slug": "multiplayer"
    }
  ]
}
```

### GET /search

Description: Global search for games, developers, and docs.

Auth: Optional.

Query parameters:

```txt
q=neon
type=games
limit=10
```

Response:

```json
{
  "success": true,
  "data": {
    "games": [
      {
        "id": "game_01JZ100",
        "slug": "neon-drifter-84",
        "title": "Neon Drifter 84",
        "coverUrl": "https://cdn.lazplay.example.com/games/neon-cover.jpg"
      }
    ],
    "developers": []
  }
}
```

---

## 5. Library, Wishlist, and Entitlement Routes

### GET /library

Description: Lists games owned by the authenticated user.

Auth: Player.

Query parameters:

```txt
page=1
limit=20
search=grid
status=installed
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "gameId": "game_01JZ100",
      "slug": "grid-runner",
      "title": "Grid Runner",
      "coverUrl": "https://cdn.lazplay.example.com/games/grid-cover.jpg",
      "ownershipType": "PURCHASED",
      "installedStatus": "READY",
      "lastPlayedAt": "2026-05-07T14:00:00.000Z",
      "playtimeSeconds": 8420,
      "updateAvailable": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### GET /library/:gameId

Description: Returns owned game library details, install status, save data status, and launch readiness.

Auth: Player.

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ100",
    "title": "Grid Runner",
    "ownedAt": "2026-05-01T09:00:00.000Z",
    "installedStatus": "READY",
    "latestBuildVersion": "1.0.4",
    "installedBuildVersion": "1.0.3",
    "updateAvailable": true,
    "playtimeSeconds": 8420,
    "cloudSavesEnabled": true
  }
}
```

### POST /library/:gameId/favorite

Description: Marks an owned game as favorite.

Auth: Player.

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ100",
    "favorite": true
  }
}
```

### DELETE /library/:gameId/favorite

Description: Removes game from favorites.

Auth: Player.

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ100",
    "favorite": false
  }
}
```

### GET /wishlist

Description: Lists the current user's wishlist.

Auth: Player.

Response:

```json
{
  "success": true,
  "data": [
    {
      "gameId": "game_01JZ200",
      "slug": "terminal-defense",
      "title": "Terminal Defense",
      "price": 0,
      "currency": "INR",
      "coverUrl": "https://cdn.lazplay.example.com/games/terminal-cover.jpg",
      "addedAt": "2026-05-07T11:00:00.000Z"
    }
  ]
}
```

### POST /wishlist/:gameId

Description: Adds a game to wishlist.

Auth: Player.

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ200",
    "wishlisted": true
  }
}
```

### DELETE /wishlist/:gameId

Description: Removes a game from wishlist.

Auth: Player.

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ200",
    "wishlisted": false
  }
}
```

### GET /entitlements

Description: Lists all game entitlements for the current user.

Auth: Player.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "ent_01JZ100",
      "gameId": "game_01JZ100",
      "source": "RAZORPAY_ORDER",
      "status": "ACTIVE",
      "grantedAt": "2026-05-07T12:10:00.000Z"
    }
  ]
}
```

### GET /games/:gameId/launch-manifest

Description: Returns signed launch/download data for an owned game.

Auth: Player.

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ100",
    "buildId": "build_01JZ100",
    "version": "1.0.4",
    "runtime": "WEBGL",
    "entrypointUrl": "https://cdn.lazplay.example.com/runtime/game_01JZ100/index.html?signature=short_lived",
    "assetManifestUrl": "https://cdn.lazplay.example.com/runtime/game_01JZ100/manifest.json?signature=short_lived",
    "expiresAt": "2026-05-07T13:00:00.000Z"
  }
}
```

---

## 6. Razorpay Payment Routes

All money amounts should be stored in the smallest currency unit. For INR, `49900` means Rs. 499.00.

### POST /payments/razorpay/orders

Description: Creates a Razorpay order for buying a game.

Auth: Player.

Request body:

```json
{
  "gameId": "game_01JZ100",
  "currency": "INR",
  "couponCode": "LAZ10"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "internalOrderId": "ord_internal_01JZ100",
    "razorpayOrderId": "order_Rzp123456",
    "amount": 44910,
    "currency": "INR",
    "receipt": "lazplay_ord_internal_01JZ100",
    "game": {
      "id": "game_01JZ100",
      "title": "Cyber Quest"
    },
    "razorpayKeyId": "rzp_live_xxxxx"
  }
}
```

### POST /payments/razorpay/verify

Description: Verifies successful Razorpay checkout signature and grants entitlement.

Auth: Player.

Request body:

```json
{
  "internalOrderId": "ord_internal_01JZ100",
  "razorpayOrderId": "order_Rzp123456",
  "razorpayPaymentId": "pay_Rzp987654",
  "razorpaySignature": "generated_signature"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "paymentStatus": "CAPTURED",
    "entitlement": {
      "id": "ent_01JZ100",
      "gameId": "game_01JZ100",
      "status": "ACTIVE"
    },
    "libraryItemCreated": true
  }
}
```

### POST /webhooks/razorpay

Description: Receives Razorpay webhooks. Must verify `X-Razorpay-Signature` using webhook secret.

Auth: Razorpay signature.

Request body example:

```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_Rzp987654",
        "order_id": "order_Rzp123456",
        "amount": 44910,
        "currency": "INR",
        "status": "captured"
      }
    }
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "received": true
  }
}
```

### GET /orders

Description: Lists current user's purchase orders.

Auth: Player.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "ord_internal_01JZ100",
      "gameId": "game_01JZ100",
      "gameTitle": "Cyber Quest",
      "amount": 44910,
      "currency": "INR",
      "status": "PAID",
      "createdAt": "2026-05-07T12:05:00.000Z"
    }
  ]
}
```

### GET /orders/:orderId

Description: Returns order details.

Auth: Player or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "id": "ord_internal_01JZ100",
    "razorpayOrderId": "order_Rzp123456",
    "razorpayPaymentId": "pay_Rzp987654",
    "gameId": "game_01JZ100",
    "amount": 44910,
    "currency": "INR",
    "status": "PAID",
    "invoiceId": "inv_01JZ100"
  }
}
```

### GET /invoices/:invoiceId

Description: Returns invoice metadata and a signed invoice download URL.

Auth: Player or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "id": "inv_01JZ100",
    "orderId": "ord_internal_01JZ100",
    "invoiceNumber": "LP-2026-0001",
    "downloadUrl": "https://cdn.lazplay.example.com/invoices/LP-2026-0001.pdf?signature=short_lived"
  }
}
```

### POST /refunds

Description: Creates a refund request. Admin approval may be required.

Auth: Player or Admin.

Request body:

```json
{
  "orderId": "ord_internal_01JZ100",
  "reason": "Accidental purchase"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "refundId": "refund_01JZ100",
    "status": "REQUESTED",
    "orderId": "ord_internal_01JZ100"
  }
}
```

---

## 7. MinIO Storage Routes

Important: The frontend should not receive permanent MinIO credentials. The backend should issue short-lived signed URLs after checking ownership and permissions.

### POST /storage/presign-upload

Description: Creates a signed single-part upload URL for small files like images and metadata files.

Auth: Developer or User.

Request body:

```json
{
  "purpose": "GAME_COVER",
  "fileName": "cover.png",
  "contentType": "image/png",
  "sizeBytes": 2400000
}
```

Response:

```json
{
  "success": true,
  "data": {
    "objectKey": "games/game_01JZ100/media/cover.png",
    "uploadUrl": "https://minio.lazplay.example.com/lazplay/games/game_01JZ100/media/cover.png?X-Amz-Signature=short_lived",
    "method": "PUT",
    "expiresAt": "2026-05-07T12:30:00.000Z"
  }
}
```

### POST /storage/presign-multipart

Description: Starts multipart upload for large game builds or videos.

Auth: Developer.

Request body:

```json
{
  "gameId": "game_01JZ100",
  "buildId": "build_01JZ100",
  "fileName": "cyber-quest-win64.zip",
  "contentType": "application/zip",
  "sizeBytes": 53687091200,
  "partCount": 512
}
```

Response:

```json
{
  "success": true,
  "data": {
    "objectKey": "builds/game_01JZ100/build_01JZ100/cyber-quest-win64.zip",
    "uploadId": "minio_upload_id",
    "parts": [
      {
        "partNumber": 1,
        "uploadUrl": "https://minio.lazplay.example.com/lazplay/builds/...partNumber=1&signature=short_lived"
      }
    ],
    "expiresAt": "2026-05-07T13:00:00.000Z"
  }
}
```

### POST /storage/complete-multipart

Description: Completes multipart upload after all parts are uploaded.

Auth: Developer.

Request body:

```json
{
  "objectKey": "builds/game_01JZ100/build_01JZ100/cyber-quest-win64.zip",
  "uploadId": "minio_upload_id",
  "parts": [
    {
      "partNumber": 1,
      "etag": "etag_from_minio"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "objectKey": "builds/game_01JZ100/build_01JZ100/cyber-quest-win64.zip",
    "completed": true,
    "sizeBytes": 53687091200
  }
}
```

### GET /storage/presign-download

Description: Creates a signed download URL for protected files.

Auth: User.

Query parameters:

```txt
objectKey=builds/game_01JZ100/build_01JZ100/cyber-quest-win64.zip
```

Response:

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://minio.lazplay.example.com/lazplay/builds/...zip?signature=short_lived",
    "expiresAt": "2026-05-07T12:30:00.000Z"
  }
}
```

### POST /webhooks/minio/object-created

Description: Receives object-created notifications from MinIO and updates asset/build state.

Auth: Internal secret.

Request body:

```json
{
  "bucket": "lazplay",
  "objectKey": "builds/game_01JZ100/build_01JZ100/cyber-quest-win64.zip",
  "sizeBytes": 53687091200,
  "etag": "minio_etag"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "processed": true
  }
}
```

---

## 8. Developer Routes

### GET /developer/profile

Description: Returns current developer profile.

Auth: Developer.

Response:

```json
{
  "success": true,
  "data": {
    "id": "dev_01JZ900",
    "userId": "usr_01JZ001",
    "displayName": "Neon Labs",
    "website": "https://neonlabs.example.com",
    "verificationStatus": "VERIFIED",
    "payoutStatus": "ACTIVE"
  }
}
```

### PATCH /developer/profile

Description: Updates developer profile.

Auth: Developer.

Request body:

```json
{
  "displayName": "Neon Labs",
  "website": "https://neonlabs.example.com",
  "supportEmail": "support@neonlabs.example.com"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "dev_01JZ900",
    "displayName": "Neon Labs",
    "website": "https://neonlabs.example.com",
    "supportEmail": "support@neonlabs.example.com"
  }
}
```

### GET /developer/games

Description: Lists games owned by the current developer.

Auth: Developer.

Query parameters:

```txt
page=1
limit=20
status=draft
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "game_01JZ100",
      "title": "Cyber Quest",
      "slug": "cyber-quest",
      "status": "PUBLISHED",
      "latestBuildVersion": "1.0.4",
      "downloads30d": 8492,
      "revenue30d": 1204500
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### POST /developer/games

Description: Creates a new draft game.

Auth: Developer.

Request body:

```json
{
  "title": "Cyber Quest",
  "slug": "cyber-quest",
  "version": "v1.0.4",
  "description": "A high-octane cyberpunk platformer.",
  "price": 49900,
  "currency": "INR",
  "priceType": "PAID",
  "licensingModel": "PREMIUM",
  "genres": ["Action", "Platformer"],
  "tags": ["Cyberpunk", "Multiplayer", "Permadeath"],
  "hardwareSpecs": ["PC_SYSTEM", "CLOUD_RELAY"],
  "systemRequirements": {
    "minimum": {
      "cpu": "Intel Core i5-6600K",
      "memory": "8 GB RAM",
      "gpu": "NVIDIA GTX 1060 6GB",
      "storage": "50 GB SSD"
    },
    "recommended": {
      "cpu": "Intel Core i7-9700K",
      "memory": "16 GB RAM",
      "gpu": "NVIDIA RTX 2070 Super",
      "storage": "50 GB NVMe SSD"
    }
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "game_01JZ100",
    "title": "Cyber Quest",
    "slug": "cyber-quest",
    "status": "DRAFT"
  }
}
```

### PATCH /developer/games/:gameId

Description: Updates game metadata.

Auth: Developer owner.

Request body:

```json
{
  "price": 39900,
  "coverObjectKey": "games/game_01JZ100/media/cover.png",
  "heroBannerObjectKey": "games/game_01JZ100/media/hero.png",
  "trailerObjectKey": "games/game_01JZ100/media/trailer.mp4"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "game_01JZ100",
    "price": 39900,
    "status": "DRAFT"
  }
}
```

### DELETE /developer/games/:gameId

Description: Deletes a draft game. Published games should be unpublished first, not hard-deleted.

Auth: Developer owner.

Response:

```json
{
  "success": true,
  "data": {
    "deleted": true
  }
}
```

### POST /developer/games/:gameId/submit-review

Description: Submits game to admin review before publishing.

Auth: Developer owner.

Request body:

```json
{
  "notes": "Ready for review. Includes Windows and WebGL builds."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ100",
    "status": "IN_REVIEW",
    "submittedAt": "2026-05-07T12:00:00.000Z"
  }
}
```

### POST /developer/games/:gameId/publish

Description: Publishes an approved game.

Auth: Developer owner or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ100",
    "status": "PUBLISHED",
    "publishedAt": "2026-05-07T12:30:00.000Z"
  }
}
```

### POST /developer/games/:gameId/unpublish

Description: Removes a game from public catalog while preserving owner/library access.

Auth: Developer owner or Admin.

Request body:

```json
{
  "reason": "Maintenance release in progress"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ100",
    "status": "UNPUBLISHED"
  }
}
```

---

## 9. Developer Build and Deployment Routes

### GET /developer/games/:gameId/builds

Description: Lists builds for a developer game.

Auth: Developer owner.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "build_01JZ100",
      "version": "1.0.4",
      "platform": "WEBGL",
      "status": "DEPLOYED",
      "sizeBytes": 536870912,
      "createdAt": "2026-05-07T10:00:00.000Z"
    }
  ]
}
```

### POST /developer/games/:gameId/builds

Description: Creates build metadata before uploading package to MinIO.

Auth: Developer owner.

Request body:

```json
{
  "version": "1.0.4",
  "platform": "WEBGL",
  "runtime": "BROWSER",
  "entrypoint": "index.html",
  "changelog": "Improved multiplayer latency."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "build_01JZ100",
    "gameId": "game_01JZ100",
    "version": "1.0.4",
    "status": "WAITING_FOR_UPLOAD"
  }
}
```

### GET /developer/builds/:buildId

Description: Returns a single build with upload, scan, and deployment status.

Auth: Developer owner.

Response:

```json
{
  "success": true,
  "data": {
    "id": "build_01JZ100",
    "gameId": "game_01JZ100",
    "version": "1.0.4",
    "platform": "WEBGL",
    "status": "SCANNED",
    "artifactObjectKey": "builds/game_01JZ100/build_01JZ100/package.zip",
    "scanStatus": "PASSED"
  }
}
```

### POST /developer/builds/:buildId/upload-url

Description: Creates signed upload URLs for a build artifact. Use multipart for large files.

Auth: Developer owner.

Request body:

```json
{
  "fileName": "cyber-quest-webgl.zip",
  "contentType": "application/zip",
  "sizeBytes": 536870912,
  "multipart": true,
  "partCount": 64
}
```

Response:

```json
{
  "success": true,
  "data": {
    "objectKey": "builds/game_01JZ100/build_01JZ100/cyber-quest-webgl.zip",
    "uploadType": "MULTIPART",
    "uploadId": "minio_upload_id",
    "parts": [
      {
        "partNumber": 1,
        "uploadUrl": "https://minio.lazplay.example.com/lazplay/builds/...partNumber=1&signature=short_lived"
      }
    ]
  }
}
```

### POST /developer/builds/:buildId/uploads/complete

Description: Marks build upload complete and queues extraction/validation.

Auth: Developer owner.

Request body:

```json
{
  "objectKey": "builds/game_01JZ100/build_01JZ100/cyber-quest-webgl.zip",
  "sizeBytes": 536870912,
  "checksumSha256": "abc123sha256"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "buildId": "build_01JZ100",
    "status": "PROCESSING",
    "jobId": "job_extract_01JZ100"
  }
}
```

### POST /developer/builds/:buildId/scan

Description: Starts antivirus/security/package validation scan.

Auth: Developer owner or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "buildId": "build_01JZ100",
    "scanStatus": "QUEUED",
    "jobId": "job_scan_01JZ100"
  }
}
```

### POST /developer/builds/:buildId/deploy

Description: Deploys a scanned build to the game hosting/runtime layer.

Auth: Developer owner.

Request body:

```json
{
  "environment": "PRODUCTION",
  "releaseNotes": "Production launch.",
  "makeLatest": true
}
```

Response:

```json
{
  "success": true,
  "data": {
    "deploymentId": "dep_01JZ100",
    "buildId": "build_01JZ100",
    "status": "QUEUED",
    "environment": "PRODUCTION"
  }
}
```

### GET /developer/deployments/:deploymentId

Description: Returns deployment status.

Auth: Developer owner or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "id": "dep_01JZ100",
    "gameId": "game_01JZ100",
    "buildId": "build_01JZ100",
    "status": "RUNNING",
    "progress": 62,
    "steps": [
      {
        "name": "extract",
        "status": "COMPLETED"
      },
      {
        "name": "publish-assets",
        "status": "RUNNING"
      }
    ]
  }
}
```

### GET /developer/deployments/:deploymentId/logs

Description: Returns deployment logs. For live logs, use `WS /ws/deployments/:deploymentId`.

Auth: Developer owner or Admin.

Query parameters:

```txt
cursor=log_01
limit=100
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "log_01",
      "level": "INFO",
      "message": "Uploading assets to MinIO CDN bucket",
      "timestamp": "2026-05-07T12:20:00.000Z"
    }
  ],
  "nextCursor": "log_02"
}
```

### GET /developer/analytics

Description: Returns developer analytics across owned games.

Auth: Developer.

Query parameters:

```txt
from=2026-05-01
to=2026-05-07
gameId=game_01JZ100
```

Response:

```json
{
  "success": true,
  "data": {
    "downloads": 8492,
    "activeInstances": 402,
    "grossRevenue": 1402050,
    "netRevenue": 1121640,
    "averageSessionSeconds": 1440,
    "series": [
      {
        "date": "2026-05-07",
        "downloads": 1200,
        "revenue": 210000
      }
    ]
  }
}
```

### GET /developer/revenue

Description: Returns developer revenue and payout summary.

Auth: Developer.

Response:

```json
{
  "success": true,
  "data": {
    "currency": "INR",
    "grossRevenue": 1402050,
    "platformFee": 280410,
    "taxes": 0,
    "netRevenue": 1121640,
    "pendingPayout": 800000,
    "paidOut": 321640
  }
}
```

---

## 10. Game Hosting and Runtime Instance Routes

### POST /instances

Description: Creates a hosted game instance for multiplayer/cloud play.

Auth: Player.

Request body:

```json
{
  "gameId": "game_01JZ100",
  "region": "ap-south-1",
  "visibility": "PRIVATE",
  "maxPlayers": 8,
  "name": "Neon Runner Lobby"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "inst_01JZ100",
    "gameId": "game_01JZ100",
    "status": "PROVISIONING",
    "region": "ap-south-1",
    "joinCode": "NR84XQ",
    "createdAt": "2026-05-07T12:40:00.000Z"
  }
}
```

### GET /instances

Description: Lists current user's hosted or joined instances.

Auth: Player.

Query parameters:

```txt
status=running
gameId=game_01JZ100
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "inst_01JZ100",
      "gameId": "game_01JZ100",
      "gameTitle": "Cyber Quest",
      "status": "RUNNING",
      "playersOnline": 3,
      "maxPlayers": 8,
      "region": "ap-south-1"
    }
  ]
}
```

### GET /instances/:instanceId

Description: Returns hosted instance details.

Auth: Player owner/member or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "id": "inst_01JZ100",
    "gameId": "game_01JZ100",
    "status": "RUNNING",
    "visibility": "PRIVATE",
    "joinCode": "NR84XQ",
    "endpoint": "wss://runtime.lazplay.example.com/instances/inst_01JZ100",
    "players": [
      {
        "userId": "usr_01JZ001",
        "displayName": "Neon Runner",
        "role": "HOST"
      }
    ]
  }
}
```

### POST /instances/:instanceId/start

Description: Starts a stopped instance.

Auth: Instance owner or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "instanceId": "inst_01JZ100",
    "status": "STARTING"
  }
}
```

### POST /instances/:instanceId/stop

Description: Stops a running instance.

Auth: Instance owner or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "instanceId": "inst_01JZ100",
    "status": "STOPPING"
  }
}
```

### POST /instances/:instanceId/restart

Description: Restarts an instance.

Auth: Instance owner or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "instanceId": "inst_01JZ100",
    "status": "RESTARTING"
  }
}
```

### DELETE /instances/:instanceId

Description: Deletes an instance and related runtime resources.

Auth: Instance owner or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "instanceId": "inst_01JZ100",
    "deleted": true
  }
}
```

### GET /instances/:instanceId/logs

Description: Returns runtime logs for an instance.

Auth: Instance owner or Admin.

Response:

```json
{
  "success": true,
  "data": [
    {
      "level": "INFO",
      "message": "Player usr_01JZ001 joined",
      "timestamp": "2026-05-07T12:45:00.000Z"
    }
  ]
}
```

### GET /instances/:instanceId/metrics

Description: Returns CPU, memory, network, and player metrics.

Auth: Instance owner or Admin.

Response:

```json
{
  "success": true,
  "data": {
    "cpuPercent": 42,
    "memoryMb": 820,
    "networkInKbps": 1200,
    "networkOutKbps": 2400,
    "playersOnline": 3,
    "latencyMs": 14
  }
}
```

### POST /instances/:instanceId/join

Description: Joins an instance using permissions or join code.

Auth: Player.

Request body:

```json
{
  "joinCode": "NR84XQ"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "instanceId": "inst_01JZ100",
    "joined": true,
    "connectToken": "short_lived_runtime_token"
  }
}
```

### GET /instances/:instanceId/connect-token

Description: Creates short-lived runtime token for WebSocket/game connection.

Auth: Instance member.

Response:

```json
{
  "success": true,
  "data": {
    "connectToken": "short_lived_runtime_token",
    "endpoint": "wss://runtime.lazplay.example.com/instances/inst_01JZ100",
    "expiresAt": "2026-05-07T13:00:00.000Z"
  }
}
```

---

## 11. Admin Routes

### GET /admin/dashboard

Description: Returns admin dashboard summary.

Auth: Admin.

Response:

```json
{
  "success": true,
  "data": {
    "usersOnline": 128,
    "activeInstances": 402,
    "serverLoadPercent": 89.4,
    "revenue24h": 1402050,
    "pendingGameReviews": 6,
    "alerts": [
      {
        "severity": "CRITICAL",
        "message": "Packet loss above 15% on node_3"
      }
    ]
  }
}
```

### GET /admin/users

Description: Lists users for moderation.

Auth: Admin.

Query parameters:

```txt
page=1
limit=20
search=runner
role=PLAYER
status=active
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "usr_01JZ001",
      "username": "neon_runner",
      "email": "runner@example.com",
      "roles": ["PLAYER"],
      "status": "ACTIVE",
      "createdAt": "2026-05-07T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

### PATCH /admin/users/:userId/role

Description: Updates user roles.

Auth: Admin.

Request body:

```json
{
  "roles": ["PLAYER", "DEVELOPER"]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "userId": "usr_01JZ001",
    "roles": ["PLAYER", "DEVELOPER"]
  }
}
```

### POST /admin/users/:userId/ban

Description: Bans a user.

Auth: Admin.

Request body:

```json
{
  "reason": "Abusive behavior",
  "expiresAt": "2026-06-07T00:00:00.000Z"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "userId": "usr_01JZ001",
    "status": "BANNED"
  }
}
```

### POST /admin/users/:userId/unban

Description: Removes an active ban.

Auth: Admin.

Response:

```json
{
  "success": true,
  "data": {
    "userId": "usr_01JZ001",
    "status": "ACTIVE"
  }
}
```

### GET /admin/games

Description: Lists all games, including drafts and review queue.

Auth: Admin.

Query parameters:

```txt
page=1
limit=20
status=IN_REVIEW
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "game_01JZ100",
      "title": "Cyber Quest",
      "developerName": "Neon Labs",
      "status": "IN_REVIEW",
      "submittedAt": "2026-05-07T12:00:00.000Z"
    }
  ]
}
```

### PATCH /admin/games/:gameId/status

Description: Approves, rejects, publishes, suspends, or unpublishes a game.

Auth: Admin.

Request body:

```json
{
  "status": "APPROVED",
  "reason": "Passed metadata and build review."
}
```

Response:

```json
{
  "success": true,
  "data": {
    "gameId": "game_01JZ100",
    "status": "APPROVED"
  }
}
```

### GET /admin/deployments

Description: Lists deployment jobs across the platform.

Auth: Admin.

Query parameters:

```txt
status=RUNNING
gameId=game_01JZ100
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "dep_01JZ100",
      "gameId": "game_01JZ100",
      "buildId": "build_01JZ100",
      "status": "RUNNING",
      "progress": 62
    }
  ]
}
```

### GET /admin/servers

Description: Lists backend/runtime server nodes.

Auth: Admin.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "node_3",
      "region": "ap-south-1",
      "status": "DEGRADED",
      "cpuPercent": 84,
      "memoryPercent": 45,
      "packetLossPercent": 15.2,
      "activeInstances": 120
    }
  ]
}
```

### GET /admin/payments

Description: Lists payments.

Auth: Admin.

Query parameters:

```txt
page=1
limit=20
status=CAPTURED
from=2026-05-01
to=2026-05-07
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "pay_internal_01JZ100",
      "razorpayPaymentId": "pay_Rzp987654",
      "orderId": "ord_internal_01JZ100",
      "amount": 44910,
      "currency": "INR",
      "status": "CAPTURED"
    }
  ]
}
```

### GET /admin/refunds

Description: Lists refund requests and refund statuses.

Auth: Admin.

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "refund_01JZ100",
      "orderId": "ord_internal_01JZ100",
      "status": "REQUESTED",
      "reason": "Accidental purchase"
    }
  ]
}
```

### GET /admin/audit-logs

Description: Lists security and admin audit events.

Auth: Admin.

Query parameters:

```txt
actorId=usr_01JZ001
action=USER_BANNED
from=2026-05-01
to=2026-05-07
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "audit_01JZ100",
      "actorId": "admin_01",
      "action": "USER_BANNED",
      "targetType": "USER",
      "targetId": "usr_01JZ001",
      "metadata": {
        "reason": "Abusive behavior"
      },
      "createdAt": "2026-05-07T12:00:00.000Z"
    }
  ]
}
```

### GET /admin/reports

Description: Returns operational reports for users, games, payments, and deployments.

Auth: Admin.

Query parameters:

```txt
type=payments
from=2026-05-01
to=2026-05-07
format=json
```

Response:

```json
{
  "success": true,
  "data": {
    "type": "payments",
    "from": "2026-05-01",
    "to": "2026-05-07",
    "totalRevenue": 8400000,
    "orderCount": 210,
    "refundCount": 4
  }
}
```

---

## 12. Notification Routes

### GET /notifications

Description: Lists current user's notifications.

Auth: User.

Query parameters:

```txt
unreadOnly=true
limit=20
```

Response:

```json
{
  "success": true,
  "data": [
    {
      "id": "notif_01JZ100",
      "type": "DEPLOYMENT_COMPLETE",
      "title": "Deployment complete",
      "body": "Cyber Quest v1.0.4 is now live.",
      "read": false,
      "createdAt": "2026-05-07T12:30:00.000Z"
    }
  ]
}
```

### POST /notifications/:notificationId/read

Description: Marks one notification as read.

Auth: User.

Response:

```json
{
  "success": true,
  "data": {
    "notificationId": "notif_01JZ100",
    "read": true
  }
}
```

### POST /notifications/read-all

Description: Marks all current user's notifications as read.

Auth: User.

Response:

```json
{
  "success": true,
  "data": {
    "updatedCount": 12
  }
}
```

---

## 13. Realtime WebSocket Channels

Realtime connections should authenticate with a short-lived JWT or access token.

### WS /ws/notifications

Description: Pushes live user notifications.

Auth: User.

Client connect:

```json
{
  "token": "jwt_access_token"
}
```

Server event:

```json
{
  "event": "notification.created",
  "data": {
    "id": "notif_01JZ100",
    "type": "PAYMENT_CAPTURED",
    "title": "Purchase complete",
    "body": "Cyber Quest was added to your library."
  }
}
```

### WS /ws/deployments/:deploymentId

Description: Streams deployment logs and progress.

Auth: Developer owner or Admin.

Server event:

```json
{
  "event": "deployment.progress",
  "data": {
    "deploymentId": "dep_01JZ100",
    "status": "RUNNING",
    "progress": 62,
    "message": "Publishing assets to MinIO"
  }
}
```

Server log event:

```json
{
  "event": "deployment.log",
  "data": {
    "level": "INFO",
    "message": "Asset manifest generated",
    "timestamp": "2026-05-07T12:25:00.000Z"
  }
}
```

### WS /ws/instances/:instanceId

Description: Streams game instance status, player joins/leaves, and runtime metrics.

Auth: Instance member or Admin.

Server event:

```json
{
  "event": "instance.metrics",
  "data": {
    "instanceId": "inst_01JZ100",
    "cpuPercent": 42,
    "memoryMb": 820,
    "playersOnline": 3,
    "latencyMs": 14
  }
}
```

---

## 14. Suggested NestJS Module Layout

```txt
backend/
  src/
    app.module.ts
    main.ts
    common/
      guards/
      decorators/
      filters/
      interceptors/
    auth/
    users/
    games/
    library/
    wishlist/
    payments/
    storage/
    developer/
    deployments/
    instances/
    admin/
    notifications/
    realtime/
    prisma/
    queue/
```

---

## 15. Core Database Models

Suggested core tables/entities:

```txt
User
RefreshSession
DeveloperProfile
Game
GameMedia
GameBuild
Deployment
DeploymentLog
GameReview
WishlistItem
Entitlement
LibraryItem
Order
Payment
Refund
Invoice
StorageObject
GameInstance
InstancePlayer
Notification
AuditLog
ServerNode
```

---

## 16. Important Security Rules

- Never expose MinIO root credentials to the frontend.
- Use signed MinIO URLs with short expiration.
- Verify Razorpay checkout signatures on `/payments/razorpay/verify`.
- Verify Razorpay webhook signatures on `/webhooks/razorpay`.
- Grant game entitlements only after confirmed payment capture.
- Restrict developer build routes to game owners.
- Run uploaded builds through malware/package validation before deployment.
- Keep admin routes behind role guard and audit every admin action.
- Use refresh token rotation.
- Rate-limit auth, payment, upload, and public search endpoints.
- Validate all request bodies with DTOs and class-validator or Zod.

---

## 17. Frontend Route Mapping

Current frontend route:

```txt
/game
```

Recommended production route:

```txt
/games/:slug
```

Current frontend route:

```txt
/deployment
```

Recommended production route:

```txt
/developer/deployments/new
```

Recommended frontend route map:

```txt
/                                  Player home
/games                             Game catalog
/games/:slug                       Game details
/play/:slug                        Browser launcher
/library                           Owned games
/library/:gameId                   Owned game management
/login                             Login
/signup                            Signup
/forgot-password                   Password reset start
/reset-password                    Password reset complete
/account                           User account
/settings                          User settings
/checkout/:gameId                  Razorpay checkout
/payment/success                   Payment success
/payment/failed                    Payment failed
/developer                         Developer dashboard
/developer/games                   Developer games
/developer/games/new               New game
/developer/games/:gameId           Edit game
/developer/games/:gameId/builds    Builds
/developer/deployments/new         New deployment
/developer/deployments/:id         Deployment status
/developer/analytics               Developer analytics
/developer/revenue                 Developer revenue
/admin                             Admin dashboard
/admin/users                       Admin users
/admin/games                       Admin games
/admin/deployments                 Admin deployments
/admin/servers                     Admin servers
/admin/payments                    Admin payments
/admin/audit-logs                  Admin audit logs
/admin/reports                     Admin reports
```

---

## 18. Extra Routes (Beyond Original Spec)

The following routes are implemented in `app.js` but were not in the original spec.

### POST /developer/register
Registers authenticated user as a developer. Creates DeveloperProfile, adds DEVELOPER role.
Auth: Any authenticated user.

### GET /developer/games/:gameId
Full developer-scoped game detail with media[], latestBuildVersion, builds[].
Auth: Developer owner or Admin.

### POST /developer/games/:gameId/media
Adds IMAGE or VIDEO media item via objectKey. Resolves to signed storage URL.
Auth: Developer owner.

### DELETE /developer/games/:gameId/media/:mediaId
Removes a media item from a game.
Auth: Developer owner.

### GET /developer/builds
Lists all builds across all developer-owned games. Filters: `?platform`, `?status`.
Auth: Developer.

### DELETE /developer/builds/:buildId
Deletes a non-deployed build. Clears game.latestBuildId if it matched.
Auth: Developer owner.

### GET /developer/deployments
Lists deployments scoped to the developer's games. Enriched with gameTitle, buildVersion. Filters: `?status`, `?gameId`.
Auth: Developer.

### DELETE /games/:gameId/reviews/:reviewId
Deletes a review. Own review (Player), any review on own game (Developer), any review (Admin).
Auth: Player/Developer/Admin.

### GET /admin/users/:userId
Returns full detail for a single user (sanitized).
Auth: Admin.

### PATCH /admin/users/:userId/status
Sets user account status. Valid: ACTIVE, INACTIVE, SUSPENDED.
Auth: Admin.

### GET /admin/deployments/:deploymentId
Full deployment detail with enriched steps[] pipeline and logCount.
Auth: Admin.

### POST /admin/servers
Registers a new runtime server node. Body: `{ id, region, status }`.
Auth: Admin.

### PATCH /admin/servers/:nodeId
Updates server node fields (status, cpuPercent, memoryPercent, etc.).
Auth: Admin.

### DELETE /admin/servers/:nodeId
Removes a server node with audit log entry.
Auth: Admin.

### POST /admin/games/:gameId/feature
Marks a game as featured. Response: `{ gameId, featured: true }`.
Auth: Admin.

### DELETE /admin/games/:gameId/feature
Removes featured status. Response: `{ gameId, featured: false }`.
Auth: Admin.

### GET /admin/instances
Paginated platform-wide instance list. Filters: `?status`, `?gameId`.
Auth: Admin.

### DELETE /admin/instances/:instanceId
Force-deletes an instance and all players. Writes audit log.
Auth: Admin.

### GET /admin/payments/:paymentId
Single payment detail with linked order and user (sanitized).
Auth: Admin.

### GET /admin/refunds/:refundId
Single refund detail with linked order.
Auth: Admin.

### PATCH /admin/refunds/:refundId
Approve/reject/process a refund. On APPROVED, revokes entitlement and notifies user.
Body: `{ status: 'APPROVED'|'REJECTED'|'PROCESSED', note? }`.
Auth: Admin.
