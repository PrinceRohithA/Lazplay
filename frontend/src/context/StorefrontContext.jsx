import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api.js";
import {
  buildMockOAuthCode,
  clearToken,
  clearUser,
  getStoredToken,
  getStoredUser,
  normalizeRole,
  roleAtLeast,
  saveToken,
  saveUser
} from "../lib/auth.js";
import { developerGames, featuredGameId, gameCatalog, notificationsSeed } from "../data/platformData.js";

const StorefrontContext = createContext(null);

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function buildDefaultUser() {
  return {
    id: 0,
    name: "Guest Player",
    email: "",
    role: "player",
    avatar: "LP"
  };
}

function normalizeNotification(item) {
  if (item.time) {
    return item;
  }

  return {
    id: item.id,
    type: item.type || "System",
    title: item.title,
    detail: item.detail,
    unread: Boolean(item.unread),
    time: item.createdAt ? "Recent" : "Now"
  };
}

function normalizeGame(remoteGame, fallback) {
  const title = remoteGame.title || remoteGame.name || fallback?.title || "Untitled Game";
  const slug = remoteGame.slug || fallback?.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    ...fallback,
    ...remoteGame,
    id: Number(remoteGame.id ?? fallback?.id),
    title,
    name: remoteGame.name || title,
    slug,
    developer: remoteGame.developer || fallback?.developer || "Independent Creator",
    genre: remoteGame.genre || fallback?.genre || "Indie",
    price: Number(remoteGame.price ?? fallback?.price ?? 0),
    priceCents: Number(remoteGame.priceCents ?? Math.round(Number(remoteGame.price ?? fallback?.price ?? 0) * 100)),
    rating: Number(remoteGame.rating ?? fallback?.rating ?? 0),
    reviewCount: Number(remoteGame.reviewCount ?? fallback?.reviewCount ?? 0),
    downloadCount: Number(remoteGame.downloadCount ?? fallback?.downloadCount ?? 0),
    tags: remoteGame.tags?.length ? remoteGame.tags : fallback?.tags || ["Indie"],
    platforms: remoteGame.platforms?.length ? remoteGame.platforms : fallback?.platforms || ["Windows"],
    description: remoteGame.description || fallback?.description || "A creator-published LazPlay game.",
    requirements: fallback?.requirements || {
      minimum: "Windows or Linux desktop, 4 GB RAM",
      recommended: "SSD storage and a modern GPU"
    },
    reviews: fallback?.reviews || [],
    updates: fallback?.updates || [`Version ${remoteGame.version || fallback?.version || "1.0.0"} is available.`],
    screenshots: fallback?.screenshots || ["Cover", "Gameplay", "Build"],
    art:
      remoteGame.art ||
      remoteGame.coverArt ||
      fallback?.art ||
      "url('https://picsum.photos/seed/lazplay-fallback/800/450')",
    owned: Boolean(remoteGame.owned ?? fallback?.owned),
    wishlist: Boolean(remoteGame.wishlist ?? fallback?.wishlist),
    inCart: Boolean(remoteGame.inCart ?? fallback?.inCart),
    installed: Boolean(fallback?.installed),
    demo: Boolean(fallback?.demo ?? Number(remoteGame.price ?? 0) === 0),
    status: remoteGame.status || fallback?.status || "published"
  };
}

function mergeCatalog(remoteGames) {
  const usedRemoteIds = new Set();

  const localMerged = gameCatalog.map((localGame) => {
    const remote = remoteGames.find((item) => Number(item.id) === localGame.id || item.slug === localGame.slug);
    if (remote) {
      usedRemoteIds.add(Number(remote.id));
      return normalizeGame(remote, localGame);
    }
    return normalizeGame(localGame, localGame);
  });

  const remoteOnly = remoteGames
    .filter((item) => !usedRemoteIds.has(Number(item.id)))
    .map((item) => normalizeGame(item, null));

  return [...remoteOnly, ...localMerged];
}

export function StorefrontProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [wishlistIds, setWishlistIds] = useState(() => readJson("lazplay_wishlist", []));
  const [cartIds, setCartIds] = useState(() => readJson("lazplay_cart", []));
  const [installedIds, setInstalledIds] = useState(() => readJson("lazplay_installed", []));
  const [language, setLanguage] = useState(() => localStorage.getItem("lazplay_language") || "English");
  const [notifications, setNotifications] = useState(notificationsSeed);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser() || buildDefaultUser());
  const [ownedIds, setOwnedIds] = useState(() => gameCatalog.filter((game) => game.owned).map((game) => game.id));
  const [remoteGames, setRemoteGames] = useState([]);
  const [creatorGames, setCreatorGames] = useState(developerGames);
  const [apiStatus, setApiStatus] = useState("idle");
  const [apiMessage, setApiMessage] = useState("");

  const isAuthenticated = Boolean(getStoredToken());
  const userRole = normalizeRole(currentUser.role);
  const canCreate = isAuthenticated;
  const canAdmin = roleAtLeast(userRole, "admin");

  useEffect(() => {
    writeJson("lazplay_wishlist", wishlistIds);
  }, [wishlistIds]);

  useEffect(() => {
    writeJson("lazplay_cart", cartIds);
  }, [cartIds]);

  useEffect(() => {
    writeJson("lazplay_installed", installedIds);
  }, [installedIds]);

  useEffect(() => {
    localStorage.setItem("lazplay_language", language);
  }, [language]);

  const refreshFromApi = useCallback(async () => {
    setApiStatus("loading");
    setApiMessage("");

    try {
      const gamesPayload = await apiRequest("/games", { auth: isAuthenticated });
      const games = gamesPayload.items || [];
      setRemoteGames(games);

      const owned = games.filter((item) => item.owned).map((item) => Number(item.id));
      const wished = games.filter((item) => item.wishlist).map((item) => Number(item.id));
      const carted = games.filter((item) => item.inCart).map((item) => Number(item.id));

      if (owned.length) {
        setOwnedIds((current) => Array.from(new Set([...current, ...owned])));
      }
      if (wished.length) {
        setWishlistIds((current) => Array.from(new Set([...current, ...wished])));
      }
      if (carted.length) {
        setCartIds((current) => Array.from(new Set([...current, ...carted])));
      }

      if (isAuthenticated) {
        const [libraryPayload, cartPayload, wishlistPayload, notificationPayload] = await Promise.all([
          apiRequest("/library"),
          apiRequest("/cart"),
          apiRequest("/wishlist"),
          apiRequest("/notifications")
        ]);

        setOwnedIds((libraryPayload.items || []).map((item) => Number(item.id)));
        setCartIds((cartPayload.items || []).map((item) => Number(item.id)));
        setWishlistIds((wishlistPayload.items || []).map((item) => Number(item.id)));
        setNotifications((notificationPayload.items || []).map(normalizeNotification));

        if (canCreate) {
          const creatorPayload = await apiRequest("/creator/games");
          setCreatorGames(creatorPayload.items || []);
        }
      }

      setApiStatus("ready");
    } catch (error) {
      setApiStatus("offline");
      setApiMessage(error.message || "Backend is unavailable. Local demo data is still available.");
    }
  }, [canCreate, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    refreshFromApi().catch((error) => {
      if (!cancelled) {
        setApiStatus("offline");
        setApiMessage(error.message || "Backend is unavailable. Local demo data is still available.");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [refreshFromApi]);

  const catalog = useMemo(() => {
    const ownedSet = new Set(ownedIds);
    const wishlistSet = new Set(wishlistIds);
    const cartSet = new Set(cartIds);
    const installedSet = new Set(installedIds);

    return mergeCatalog(remoteGames).map((game) => ({
      ...game,
      owned: ownedSet.has(game.id),
      wishlist: wishlistSet.has(game.id),
      inCart: cartSet.has(game.id),
      installed: installedSet.has(game.id)
    }));
  }, [cartIds, installedIds, ownedIds, remoteGames, wishlistIds]);

  const featuredGame = useMemo(
    () => catalog.find((game) => game.id === featuredGameId) || catalog[0] || null,
    [catalog]
  );

  const cartItems = useMemo(
    () => catalog.filter((game) => cartIds.includes(game.id)),
    [catalog, cartIds]
  );

  const wishlistItems = useMemo(
    () => catalog.filter((game) => wishlistIds.includes(game.id)),
    [catalog, wishlistIds]
  );

  const ownedGames = useMemo(
    () => catalog.filter((game) => game.owned),
    [catalog]
  );

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, game) => sum + game.price, 0),
    [cartItems]
  );

  const installedGames = useMemo(
    () => catalog.filter((game) => game.installed),
    [catalog]
  );

  const signInWithMockOAuth = async ({ email, name, provider, role = "player" }) => {
    const profile = {
      email: email.toLowerCase(),
      name,
      provider,
      role: normalizeRole(role),
      oauthId: email.split("@")[0] || "player"
    };

    const code = buildMockOAuthCode(profile);
    const payload = await apiRequest(`/auth/callback?format=json&code=${encodeURIComponent(code)}`, {
      auth: false
    });
    const user = {
      ...payload.user,
      role: normalizeRole(payload.user?.role)
    };

    saveToken(payload.token);
    saveUser(user);
    setCurrentUser(user);
    await refreshFromApi();

    return user;
  };

  const signOut = () => {
    clearToken();
    clearUser();
    setCurrentUser(buildDefaultUser());
    setCreatorGames(developerGames);
    setOwnedIds(gameCatalog.filter((game) => game.owned).map((game) => game.id));
  };

  const toggleWishlist = async (gameId) => {
    const shouldRemove = wishlistIds.includes(gameId);
    setWishlistIds((current) =>
      shouldRemove ? current.filter((id) => id !== gameId) : [...current, gameId]
    );

    if (!isAuthenticated) {
      return;
    }

    try {
      await apiRequest(`/wishlist/${gameId}`, {
        method: shouldRemove ? "DELETE" : "POST"
      });
    } catch (error) {
      setApiMessage(error.message);
    }
  };

  const toggleCart = async (gameId) => {
    const shouldRemove = cartIds.includes(gameId);
    setCartIds((current) =>
      shouldRemove ? current.filter((id) => id !== gameId) : [...current, gameId]
    );

    if (!isAuthenticated) {
      return;
    }

    try {
      await apiRequest(`/cart/items/${gameId}`, {
        method: shouldRemove ? "DELETE" : "POST"
      });
    } catch (error) {
      setApiMessage(error.message);
    }
  };

  const removeFromCart = async (gameId) => {
    setCartIds((current) => current.filter((id) => id !== gameId));

    if (isAuthenticated) {
      await apiRequest(`/cart/items/${gameId}`, { method: "DELETE" }).catch((error) => setApiMessage(error.message));
    }
  };

  const claimGame = async (gameId) => {
    if (!isAuthenticated) {
      toggleCart(gameId);
      return;
    }

    const payload = await apiRequest(`/library/${gameId}`, { method: "POST" });
    const ids = (payload.items || []).map((item) => Number(item.id));
    setOwnedIds(ids);
    setCartIds((current) => current.filter((id) => id !== gameId));
  };

  const checkoutCart = async () => {
    if (!isAuthenticated) {
      setOwnedIds((current) => Array.from(new Set([...current, ...cartIds])));
      setCartIds([]);
      return { order: { total: cartTotal, status: "paid" }, items: cartItems };
    }

    const payload = await apiRequest("/checkout", { method: "POST" });
    setOwnedIds((payload.items || []).map((item) => Number(item.id)));
    setCartIds([]);
    await refreshFromApi();
    return payload;
  };

  const downloadGame = async (gameId) => {
    const payload = await apiRequest(`/download/${gameId}`);
    window.location.assign(payload.downloadUrl);
  };

  const uploadGame = async (form) => {
    form.set("status", "pending");
    const payload = await apiRequest("/creator/games", {
      method: "POST",
      body: form
    });

    setCreatorGames((current) => [payload.game, ...current.filter((game) => game.id !== payload.game.id)]);
    setRemoteGames((current) => [payload.game, ...current.filter((game) => game.id !== payload.game.id)]);
    setOwnedIds((current) => Array.from(new Set([...current, payload.game.id])));

    return payload;
  };

  const updateCreatorGame = async (gameId, updates) => {
    const game = await apiRequest(`/creator/games/${gameId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(updates)
    });

    setCreatorGames((current) => current.map((item) => (item.id === game.id ? game : item)));
    setRemoteGames((current) => current.map((item) => (item.id === game.id ? game : item)));
    return game;
  };

  const archiveCreatorGame = async (gameId) => {
    const game = await apiRequest(`/creator/games/${gameId}`, { method: "DELETE" });
    setCreatorGames((current) => current.map((item) => (item.id === game.id ? game : item)));
    setRemoteGames((current) => current.map((item) => (item.id === game.id ? game : item)));
    return game;
  };

  const dismissNotification = (notificationId) => {
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId));

    if (isAuthenticated) {
      apiRequest(`/notifications/${notificationId}`, { method: "PATCH" }).catch((error) => setApiMessage(error.message));
    }
  };

  const toggleInstalled = (gameId) => {
    setInstalledIds((current) =>
      current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId]
    );
  };

  const value = {
    catalog,
    featuredGame,
    cartItems,
    cartTotal,
    wishlistItems,
    ownedGames,
    installedGames,
    creatorGames,
    searchTerm,
    setSearchTerm,
    quickFilter,
    setQuickFilter,
    wishlistIds,
    cartIds,
    installedIds,
    toggleWishlist,
    toggleCart,
    removeFromCart,
    toggleInstalled,
    claimGame,
    checkoutCart,
    downloadGame,
    uploadGame,
    updateCreatorGame,
    archiveCreatorGame,
    notifications,
    dismissNotification,
    currentUser,
    setCurrentUser,
    signInWithMockOAuth,
    signOut,
    language,
    setLanguage,
    isAuthenticated,
    userRole,
    canCreate,
    canAdmin,
    apiStatus,
    apiMessage,
    refreshFromApi
  };

  return <StorefrontContext.Provider value={value}>{children}</StorefrontContext.Provider>;
}

export function useStorefront() {
  const context = useContext(StorefrontContext);

  if (!context) {
    throw new Error("useStorefront must be used within StorefrontProvider");
  }

  return context;
}
