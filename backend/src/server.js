import { app } from "./app.js";
import { env } from "./config/env.js";
import { pool } from "./config/db.js";
import { initializeDatabase } from "./db/init.js";
import { ensureStorageDirectory } from "./services/storage.service.js";

async function bootstrap() {
  await ensureStorageDirectory();
  await initializeDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`Backend running on http://localhost:${env.PORT}`);
  });

  const shutdown = async () => {
    console.log("Shutting down backend...");
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

bootstrap().catch((error) => {
  console.error("Failed to start backend", error);
  process.exit(1);
});
