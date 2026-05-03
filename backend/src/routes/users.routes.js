import { Router } from "express";
import { getMe, updateMe } from "../controllers/users.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/auth/me", requireAuth, getMe);
router.get("/users/me", requireAuth, getMe);
router.patch("/users/me", requireAuth, updateMe);

export default router;
