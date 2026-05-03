import { Router } from "express";
import {
  addToCart,
  addToWishlist,
  checkout,
  claimGame,
  getCart,
  getLibrary,
  getNotifications,
  getWishlist,
  markNotificationRead,
  removeFromCart,
  removeFromWishlist
} from "../controllers/player.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/library", requireAuth, getLibrary);
router.post("/library/:gameId(\\d+)", requireAuth, claimGame);

router.get("/cart", requireAuth, getCart);
router.post("/cart/items", requireAuth, addToCart);
router.post("/cart/items/:gameId(\\d+)", requireAuth, addToCart);
router.delete("/cart/items/:gameId(\\d+)", requireAuth, removeFromCart);
router.post("/checkout", requireAuth, checkout);

router.get("/wishlist", requireAuth, getWishlist);
router.post("/wishlist/:gameId(\\d+)", requireAuth, addToWishlist);
router.delete("/wishlist/:gameId(\\d+)", requireAuth, removeFromWishlist);

router.get("/notifications", requireAuth, getNotifications);
router.patch("/notifications/:notificationId(\\d+)", requireAuth, markNotificationRead);

export default router;
