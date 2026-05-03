import { Router } from "express";
import {
  getThreads,
  postThread,
  postThreadLike
} from "../controllers/community.controller.js";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/community/threads", optionalAuth, getThreads);
router.post("/community/threads", requireAuth, postThread);
router.post("/community/threads/:threadId(\\d+)/like", requireAuth, postThreadLike);

export default router;
