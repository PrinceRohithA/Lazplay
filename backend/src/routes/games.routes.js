import { Router } from "express";
import { getGameDetails, listGames, uploadGame } from "../controllers/games.controller.js";
import { optionalAuth, requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { uploadGameArchive } from "../middleware/upload.middleware.js";
import { roles } from "../utils/roles.js";

const router = Router();

router.get("/games", optionalAuth, listGames);
router.get("/games/:id(\\d+)", optionalAuth, getGameDetails);
router.post("/games/upload", requireAuth, requireRole(roles.CREATOR), uploadGameArchive, uploadGame);

export default router;
