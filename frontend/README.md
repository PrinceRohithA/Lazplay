# Frontend

Vite + React frontend for LazPlay local server.

## Features

- OAuth login start flow via backend /auth/login
- Callback handler stores JWT token in localStorage
- Game listing screen backed by GET /games
- Download button calls GET /download/:gameId then redirects to game file URL

## Setup

1. Copy env file:

   cp .env.example .env

2. Install dependencies:

   npm install

3. Run dev server:

   npm run dev

Frontend runs on http://localhost:5173.
