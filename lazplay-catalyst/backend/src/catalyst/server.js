import { createServer } from 'node:http';
import { createApp } from './app.js';
import { config } from './config.js';

const port = Number(process.env.X_ZOHO_CATALYST_LISTEN_PORT || process.env.PORT || 2000);
const server = createServer(createApp());

server.listen(port, () => {
  console.log(`Lazplay Catalyst API listening on port ${port} for ${config.apiPrefixes.join(', ')}`);
});
