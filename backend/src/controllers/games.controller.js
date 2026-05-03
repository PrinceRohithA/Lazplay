import fs from "node:fs/promises";
import { env } from "../config/env.js";
import {
  archiveGameForOwner,
  createGame,
  getGameByIdForViewer,
  grantUserAccessToGame,
  listGamesForDeveloper,
  listGamesForViewer,
  normalizeGameInput,
  updateGameForOwner
} from "../services/game.service.js";
import { moveUploadedFileToStorage } from "../services/storage.service.js";
import { warmGameFileCache } from "../utils/cacheWarmer.js";

function gamePublicUrl(filePath) {
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  return `${base}/games/${encodeURIComponent(filePath)}`;
}

export async function listGames(req, res, next) {
  try {
    const games = await listGamesForViewer(req.user, {
      search: req.query.search
    });

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

    const game = await getGameByIdForViewer(gameId, req.user);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    return res.json(game);
  } catch (error) {
    return next(error);
  }
}

export async function listCreatorGames(req, res, next) {
  try {
    const games = await listGamesForDeveloper(req.user.id);
    return res.json({ items: games });
  } catch (error) {
    return next(error);
  }
}

export async function uploadGame(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Missing upload file. Send a .zip file in field 'file'." });
    }

    const input = normalizeGameInput(req.body);
    // New uploads must be reviewed by admins before becoming playable.
    input.status = "pending";

    const movedFile = await moveUploadedFileToStorage({
      tempPath: req.file.path,
      originalName: req.file.originalname,
      gameName: input.name,
      version: input.version
    });

    let game;
    try {
      game = await createGame({
        developerId: req.user.id,
        name: input.name,
        version: input.version,
        description: input.description,
        genre: input.genre,
        priceCents: input.priceCents,
        coverArt: input.coverArt,
        status: input.status,
        tags: input.tags,
        platforms: input.platforms,
        slug: input.slug,
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

    await grantUserAccessToGame(req.user.id, game.id, {
      source: "creator",
      priceCents: 0
    });

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

export async function updateCreatorGame(req, res, next) {
  try {
    const gameId = Number(req.params.id);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const game = await updateGameForOwner(gameId, req.user, req.body || {});
    if (!game) {
      return res.status(404).json({ error: "Game not found or not owned by this creator." });
    }

    return res.json(game);
  } catch (error) {
    return next(error);
  }
}

export async function archiveCreatorGame(req, res, next) {
  try {
    const gameId = Number(req.params.id);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const game = await archiveGameForOwner(gameId, req.user);
    if (!game) {
      return res.status(404).json({ error: "Game not found or not owned by this creator." });
    }

    return res.json(game);
  } catch (error) {
    return next(error);
  }
}
