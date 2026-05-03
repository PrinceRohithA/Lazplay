import { Router } from "express";
import { getDownloadUrl } from "../controllers/download.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/download/:gameId(\\d+)", requireAuth, getDownloadUrl);

export default router;
