import { createServer } from 'node:http';
import { createApp } from '../src/app.js';

const app = await createApp();
const server = createServer(app);

const listen = () =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address()));
  });

const close = () =>
  new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

const request = async (baseUrl, path, options = {}) => {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json();
  if (!response.ok || body.success === false) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
};

try {
  const address = await listen();
  const baseUrl = `http://${address.address}:${address.port}/api/v1`;

  const health = await request(baseUrl, '/health');
  console.log(`health: ${health.data.status}`);

  const login = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'player@example.com',
      password: 'Password123!'
    })
  });
  const token = login.data.accessToken;
  console.log(`login: ${login.data.user.email}`);

  const games = await request(baseUrl, '/games?limit=2', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log(`games: ${games.data.length}`);

  const library = await request(baseUrl, '/library', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  console.log(`library: ${library.data.length}`);

  const order = await request(baseUrl, '/payments/razorpay/orders', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      gameId: 'game_neon_drifter',
      couponCode: 'LAZ10'
    })
  });
  console.log(`order: ${order.data.internalOrderId}`);

  const upload = await request(baseUrl, '/storage/presign-upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      purpose: 'AVATAR',
      fileName: 'avatar.png',
      contentType: 'image/png',
      sizeBytes: 1000
    })
  });
  console.log(`upload: ${upload.data.objectKey}`);

  const instance = await request(baseUrl, '/instances', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      gameId: 'game_cyber_quest',
      name: 'Smoke Test Lobby'
    })
  });
  console.log(`instance: ${instance.data.id}`);

  const devLogin = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'dev@example.com',
      password: 'Password123!'
    })
  });
  const devToken = devLogin.data.accessToken;
  const developerGames = await request(baseUrl, '/developer/games', {
    headers: {
      Authorization: `Bearer ${devToken}`
    }
  });
  console.log(`developer games: ${developerGames.data.length}`);

  const adminLogin = await request(baseUrl, '/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'admin@example.com',
      password: 'Password123!'
    })
  });
  const adminToken = adminLogin.data.accessToken;
  const adminDashboard = await request(baseUrl, '/admin/dashboard', {
    headers: {
      Authorization: `Bearer ${adminToken}`
    }
  });
  console.log(`admin active instances: ${adminDashboard.data.activeInstances}`);
} finally {
  await close();
}
