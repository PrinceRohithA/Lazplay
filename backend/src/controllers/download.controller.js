import { env } from "../config/env.js";
import { getGameByIdForUser, markGameDownloaded } from "../services/game.service.js";

function buildDownloadUrl(filePath) {
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  return `${base}/games/${encodeURIComponent(filePath)}`;
}

export async function getDownloadUrl(req, res, next) {
  try {
    const gameId = Number(req.params.gameId);
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const game = await getGameByIdForUser(gameId, req.user.id);
    if (!game) {
      return res.status(404).json({ error: "Game not found" });
    }

    // Only users with ownership in user_games can request a download URL.
    if (!game.owned) {
      return res.status(403).json({ error: "You do not have access to this game." });
    }

    await markGameDownloaded(req.user.id, game.id);

    return res.json({
      gameId: game.id,
      downloadUrl: buildDownloadUrl(game.filePath)
    });
  } catch (error) {
    return next(error);
  }
}
