import { createThread, likeThread, listThreads } from "../services/community.service.js";

export async function getThreads(req, res, next) {
  try {
    const items = await listThreads({
      category: req.query.category,
      gameId: req.query.gameId
    });

    return res.json({ items });
  } catch (error) {
    return next(error);
  }
}

export async function postThread(req, res, next) {
  try {
    const thread = await createThread(req.user.id, req.body || {});
    return res.status(201).json(thread);
  } catch (error) {
    return next(error);
  }
}

export async function postThreadLike(req, res, next) {
  try {
    const threadId = Number(req.params.threadId);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return res.status(400).json({ error: "Invalid thread id" });
    }

    const thread = await likeThread(threadId);
    if (!thread) {
      return res.status(404).json({ error: "Thread not found" });
    }

    return res.json(thread);
  } catch (error) {
    return next(error);
  }
}
