import {
  listGamesForAdmin,
  listUsersForAdmin,
  updateGameStatusForAdmin
} from "../services/admin.service.js";

export async function getAdminUsers(_req, res, next) {
  try {
    return res.json({ items: await listUsersForAdmin() });
  } catch (error) {
    return next(error);
  }
}

export async function getAdminGames(_req, res, next) {
  try {
    return res.json({ items: await listGamesForAdmin() });
  } catch (error) {
    return next(error);
  }
}

export async function patchAdminGameStatus(req, res, next) {
  try {
    const gameId = Number(req.params.id);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const status = String(req.body?.status || "").toLowerCase();
    if (!["draft", "published", "unlisted", "archived"].includes(status)) {
      return res.status(400).json({ error: "Invalid game status" });
    }

    const game = await updateGameStatusForAdmin(gameId, status);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    return res.json(game);
  } catch (error) {
    return next(error);
  }
}
