import {
  addCartItem,
  addWishlistItem,
  checkoutCart,
  claimFreeGame,
  dismissNotification,
  listCart,
  listLibrary,
  listNotifications,
  listWishlist,
  removeCartItem,
  removeWishlistItem
} from "../services/player.service.js";

function parseGameId(value) {
  const gameId = Number(value);
  return Number.isInteger(gameId) && gameId > 0 ? gameId : null;
}

export async function getLibrary(req, res, next) {
  try {
    return res.json({ items: await listLibrary(req.user.id) });
  } catch (error) {
    return next(error);
  }
}

export async function claimGame(req, res, next) {
  try {
    const gameId = parseGameId(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const library = await claimFreeGame(req.user.id, gameId);
    if (!library) {
      return res.status(402).json({ error: "This game cannot be claimed for free." });
    }

    return res.status(201).json({ items: library });
  } catch (error) {
    return next(error);
  }
}

export async function getCart(req, res, next) {
  try {
    return res.json({ items: await listCart(req.user.id) });
  } catch (error) {
    return next(error);
  }
}

export async function addToCart(req, res, next) {
  try {
    const gameId = parseGameId(req.body?.gameId || req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const cart = await addCartItem(req.user.id, gameId);
    if (!cart) {
      return res.status(404).json({ error: "Game not found" });
    }

    return res.status(201).json({ items: cart });
  } catch (error) {
    return next(error);
  }
}

export async function removeFromCart(req, res, next) {
  try {
    const gameId = parseGameId(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    return res.json({ items: await removeCartItem(req.user.id, gameId) });
  } catch (error) {
    return next(error);
  }
}

export async function checkout(req, res, next) {
  try {
    const result = await checkoutCart(req.user.id);
    if (!result) {
      return res.status(400).json({ error: "Cart is empty" });
    }

    return res.status(201).json(result);
  } catch (error) {
    return next(error);
  }
}

export async function getWishlist(req, res, next) {
  try {
    return res.json({ items: await listWishlist(req.user.id) });
  } catch (error) {
    return next(error);
  }
}

export async function addToWishlist(req, res, next) {
  try {
    const gameId = parseGameId(req.params.gameId || req.body?.gameId);
    if (!gameId) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    const wishlist = await addWishlistItem(req.user.id, gameId);
    if (!wishlist) {
      return res.status(404).json({ error: "Game not found" });
    }

    return res.status(201).json({ items: wishlist });
  } catch (error) {
    return next(error);
  }
}

export async function removeFromWishlist(req, res, next) {
  try {
    const gameId = parseGameId(req.params.gameId);
    if (!gameId) {
      return res.status(400).json({ error: "Invalid game id" });
    }

    return res.json({ items: await removeWishlistItem(req.user.id, gameId) });
  } catch (error) {
    return next(error);
  }
}

export async function getNotifications(req, res, next) {
  try {
    return res.json({ items: await listNotifications(req.user.id) });
  } catch (error) {
    return next(error);
  }
}

export async function markNotificationRead(req, res, next) {
  try {
    const notificationId = Number(req.params.notificationId);
    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({ error: "Invalid notification id" });
    }

    return res.json({ items: await dismissNotification(req.user.id, notificationId) });
  } catch (error) {
    return next(error);
  }
}
