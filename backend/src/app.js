import cors from "cors";
import express from "express";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import adminRoutes from "./routes/admin.routes.js";
import authRoutes from "./routes/auth.routes.js";
import communityRoutes from "./routes/community.routes.js";
import creatorRoutes from "./routes/creator.routes.js";
import downloadRoutes from "./routes/download.routes.js";
import gamesRoutes from "./routes/games.routes.js";
import playerRoutes from "./routes/player.routes.js";
import usersRoutes from "./routes/users.routes.js";

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
app.use(usersRoutes);
app.use(gamesRoutes);
app.use(playerRoutes);
app.use(creatorRoutes);
app.use(communityRoutes);
app.use(adminRoutes);
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
