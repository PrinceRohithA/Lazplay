import { Router } from "express";
import { getGameDetails, listGames, uploadGame } from "../controllers/games.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadGameArchive } from "../middleware/upload.middleware.js";

const router = Router();

router.get("/games", requireAuth, listGames);
router.get("/games/:id(\\d+)", requireAuth, getGameDetails);
router.post("/games/upload", requireAuth, uploadGameArchive, uploadGame);

export default router;
