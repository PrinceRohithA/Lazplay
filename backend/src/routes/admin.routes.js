import { Router } from "express";
import {
  getAdminGames,
  getAdminUsers,
  patchAdminGameStatus
} from "../controllers/admin.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";
import { roles } from "../utils/roles.js";

const router = Router();
const adminGate = [requireAuth, requireRole(roles.ADMIN)];

router.get("/admin/users", adminGate, getAdminUsers);
router.get("/admin/games", adminGate, getAdminGames);
router.patch("/admin/games/:id(\\d+)/status", adminGate, patchAdminGameStatus);

export default router;
