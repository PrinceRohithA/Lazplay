import cors from "cors";
import express from "express";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import authRoutes from "./routes/auth.routes.js";
import downloadRoutes from "./routes/download.routes.js";
import gamesRoutes from "./routes/games.routes.js";

const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin: env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use(authRoutes);
app.use(gamesRoutes);
app.use(downloadRoutes);

// Static file serving for game archives. Express handles range requests automatically.
app.use(
  "/games",
  express.static(env.GAME_STORAGE_DIR, {
    index: false,
    etag: true,
    fallthrough: true,
    setHeaders: (res) => {
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  })
);

app.use(notFoundHandler);
app.use(errorHandler);

export { app };
