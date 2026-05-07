import { createServer } from 'node:http';
import { createApp, config } from './app.js';

const port = Number(process.env.PORT || 3000);
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
