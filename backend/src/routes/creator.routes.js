import { Router } from "express";
import {
  archiveCreatorGame,
  listCreatorGames,
  updateCreatorGame,
  uploadGame
} from "../controllers/games.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { uploadGameArchive } from "../middleware/upload.middleware.js";
import { roles } from "../utils/roles.js";

const router = Router();
const creatorGate = [requireAuth, requireRole(roles.CREATOR)];

router.get("/creator/games", creatorGate, listCreatorGames);
router.post("/creator/games", creatorGate, uploadGameArchive, uploadGame);
router.patch("/creator/games/:id(\\d+)", creatorGate, updateCreatorGame);
router.delete("/creator/games/:id(\\d+)", creatorGate, archiveCreatorGame);

// Backward-friendly aliases for screens still named "developer" in the UI.
router.get("/developer/games", creatorGate, listCreatorGames);
router.post("/developer/games", creatorGate, uploadGameArchive, uploadGame);
router.patch("/developer/games/:id(\\d+)", creatorGate, updateCreatorGame);
router.delete("/developer/games/:id(\\d+)", creatorGate, archiveCreatorGame);

export default router;
