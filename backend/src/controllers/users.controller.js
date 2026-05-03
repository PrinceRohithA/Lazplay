import { getUserById, updateUserProfile } from "../services/auth.service.js";

export async function getMe(req, res, next) {
  try {
    const user = await getUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}

export async function updateMe(req, res, next) {
  try {
    const user = await updateUserProfile(req.user.id, {
      name: req.body?.name,
      bio: req.body?.bio,
      avatarUrl: req.body?.avatarUrl
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user });
  } catch (error) {
    return next(error);
  }
}
