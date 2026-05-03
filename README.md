# LazPlay Local Full-Stack Structure

This workspace now includes a clean self-hosted setup:

- frontend: web client
- backend: Node.js + Express API and local game file storage

Legacy Catalyst folders are still present for reference, but the new local flow is fully under frontend and backend.

## Local Development

### 1) Start PostgreSQL

Create a database named lazplay (or update backend/.env with your own DB name).

### 2) Configure backend

- Copy backend/.env.example to backend/.env
- Update DB credentials and JWT secret

Run backend:

- cd backend
- npm install
- npm start

Backend URL:

- http://localhost:3000

### 3) Configure frontend

- Copy frontend/.env.example to frontend/.env (optional if using defaults)

Run frontend:

- cd frontend
- npm install
- npm run dev

Frontend URL:

- http://localhost:5173

## API Surface

Implemented in backend with role-aware access:

- GET /auth/login
- GET /auth/callback
- GET /auth/me
- GET /games
- GET /games/:id
- GET /library
- POST /library/:gameId
- GET /cart
- POST /cart/items
- DELETE /cart/items/:gameId
- POST /checkout
- GET /wishlist
- POST /wishlist/:gameId
- DELETE /wishlist/:gameId
- GET /download/:gameId
- GET /creator/games
- POST /creator/games
- PATCH /creator/games/:id
- DELETE /creator/games/:id
- GET /community/threads
- POST /community/threads
- GET /admin/users
- GET /admin/games
- PATCH /admin/games/:id/status

Backward-compatible upload endpoint:

- POST /games/upload (multipart form-data)

## Authentication and Security

- JWT only, no cookies
- Protected routes require Authorization: Bearer <token>
- Download URL endpoint validates user access in user_games

## Database Schema

Defined in backend/src/db/schema.sql:

- users with player, creator, and admin roles
- games with creator ownership, status, price, tags, platforms, and storage metadata
- user_games for ownership/access
- cart_items, wishlist_items, orders, order_items
- community_threads
- notifications

Auto initialization and seed data are controlled by:

- DB_AUTO_INIT
- DB_AUTO_SEED

## File Serving

Game files are served from backend/storage/games and exposed at:

- http://localhost:3000/games/<file>

Example seeded file:

- http://localhost:3000/games/game_v1.zip

Express static serving provides range request support and headers for resumable downloads:

- Accept-Ranges
- Content-Type
- Content-Length

## CDN Readiness

- Download API returns plain cacheable URLs (not signed URLs)
- Cache-Control is set for long-lived public caching
- Upload flow performs an automatic warm-up fetch after storing a new game
