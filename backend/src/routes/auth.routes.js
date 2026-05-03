import { Router } from "express";
import { callback, login } from "../controllers/auth.controller.js";

const router = Router();

router.get("/auth/login", login);
router.get("/auth/callback", callback);

export default router;
