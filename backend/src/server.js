import { createServer } from 'node:http';
import { createApp, config } from './app.js';

const port = Number(process.env.PORT || 2000);

console.log('--- Environment Check ---');
console.log(`PORT: ${port}`);
console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? (process.env.DATABASE_URL.includes(':') ? process.env.DATABASE_URL.split(':')[0] + ':***' : 'DEFINED') : 'UNDEFINED'}`);
console.log(`APP_ENV: ${process.env.APP_ENV}`);
console.log(`AUTH_SECRET: ${process.env.AUTH_SECRET ? '***' : 'UNDEFINED'}`);
console.log('------------------------');

const app = await createApp();
const server = createServer(app);

server.on('upgrade', (req, socket) => {
  socket.write(
    'HTTP/1.1 426 Upgrade Required\r\n' +
    'Content-Type: application/json\r\n' +
    '\r\n' +
    JSON.stringify({
      success: false,
      error: {
        code: 'WEBSOCKET_NOT_ENABLED',
        message: 'Realtime WebSocket channels are documented but not enabled in this dependency-free backend yet.'
      }
    })
  );
  socket.destroy();
});

server.listen(port, () => {
  console.log(`LazPlay backend running on http://localhost:${port}${config.apiPrefix}`);
});
