# Backend

Node.js + Express API for local self-hosted LazPlay runtime.

## Features

- JWT authentication using Authorization Bearer tokens (no cookies)
- Mock OAuth login flow for local development
- PostgreSQL schema: users, games, user_games
- API routes:
  - GET /auth/login
  - GET /auth/callback
  - GET /games
  - GET /games/:id
  - GET /download/:gameId
  - POST /games/upload (extra endpoint to upload archives)
- Local game file serving from storage/games via /games/<file>
- Range request support for resumable downloads
- Cache warm-up request after upload

## Setup

1. Copy environment template:

   cp .env.example .env

2. Update `DATABASE_URL` in .env.

3. Install dependencies:

   npm install

4. Start backend:

   npm start

The backend listens on http://localhost:3000 by default.

## Local OAuth flow

- Frontend starts login at /auth/login
- In mock mode, backend generates a mock OAuth code
- Callback endpoint creates/updates user and issues JWT
- Backend redirects to frontend callback URL with token

## Upload API example

Use multipart/form-data:

- field file: .zip archive
- field name: game name
- field version: semantic or numeric version

Example curl:

curl -X POST http://localhost:3000/games/upload \
  -H "Authorization: Bearer <token>" \
  -F "name=My Game" \
  -F "version=1" \
  -F "file=@./my-game.zip"
