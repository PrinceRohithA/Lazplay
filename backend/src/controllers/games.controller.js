import fs from "node:fs/promises";
import { env } from "../config/env.js";
import {
  createGame,
  getGameByIdForUser,
  grantUserAccessToGame,
  listGamesForUser
} from "../services/game.service.js";
import { moveUploadedFileToStorage } from "../services/storage.service.js";
import { warmGameFileCache } from "../utils/cacheWarmer.js";

function gamePublicUrl(filePath) {
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  return `${base}/games/${encodeURIComponent(filePath)}`;
}

export async function listGames(req, res, next) {
  try {
    const games = await listGamesForUser(req.user.id);
    return res.json({
      items: games
    });
  } catch (error) {
    return next(error);
  }
}

export async function getGameDetails(req, res, next) {
  try {
    const gameId = Number(req.params.id);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const game = await getGameByIdForUser(gameId, req.user.id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    return res.json(game);
  } catch (error) {
    return next(error);
  }
}

export async function uploadGame(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing upload file. Send a .zip file in field 'file'." });
    }

    const gameName = String(req.body.name || "Untitled Game").trim();
    const version = String(req.body.version || "1").trim();

    const movedFile = await moveUploadedFileToStorage({
      tempPath: req.file.path,
      originalName: req.file.originalname,
      gameName,
      version
    });

    let game;
    try {
      game = await createGame({
        name: gameName,
        version,
        filePath: movedFile.fileName,
        size: movedFile.size
      });
    } catch (error) {
      await fs.unlink(movedFile.absolutePath).catch(() => {});
      if (error?.code === "23505") {
        return res.status(409).json({ error: "A game with the same name and version already exists." });
      }
      throw error;
    }

    await grantUserAccessToGame(req.user.id, game.id);

    const downloadUrl = gamePublicUrl(game.filePath);
    const cacheWarm = await warmGameFileCache(downloadUrl);

    return res.status(201).json({
      game: {
        ...game,
        owned: true
      },
      downloadUrl,
      cacheWarm
    });
  } catch (error) {
    return next(error);
  }
}
