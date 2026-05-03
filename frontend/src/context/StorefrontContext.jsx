import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../lib/api.js";
import {
  buildMockOAuthCode,
  clearToken,
  clearUser,
  getStoredToken,
  getStoredUser,
  saveToken,
  saveUser
} from "../lib/auth.js";
import { featuredGameId, gameCatalog, notificationsSeed } from "../data/platformData.js";

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
    name: "Player One",
    email: "player1@lazplay.local",
    role: "Explorer",
    avatar: "LP"
  };
}

export function StorefrontProvider({ children }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [wishlistIds, setWishlistIds] = useState(() => readJson("lazplay_wishlist", [2, 3, 6]));
  const [cartIds, setCartIds] = useState(() => readJson("lazplay_cart", [2, 6]));
  const [installedIds, setInstalledIds] = useState(() => readJson("lazplay_installed", [1, 5, 8]));
  const [language, setLanguage] = useState(() => localStorage.getItem("lazplay_language") || "English");
  const [notifications, setNotifications] = useState(notificationsSeed);
  const [currentUser, setCurrentUser] = useState(() => getStoredUser() || buildDefaultUser());
  const [ownedIds, setOwnedIds] = useState(() => gameCatalog.filter((game) => game.owned).map((game) => game.id));

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

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      return;
    }

    let cancelled = false;

    apiRequest("/games")
      .then((payload) => {
        if (cancelled) {
          return;
        }

        const ids = (payload.items || [])
          .filter((item) => item.owned)
          .map((item) => Number(item.id))
          .filter(Number.isFinite);

        if (ids.length) {
          setOwnedIds((current) => Array.from(new Set([...current, ...ids])));
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const catalog = useMemo(() => {
    const ownedSet = new Set(ownedIds);
    const wishlistSet = new Set(wishlistIds);
    const installedSet = new Set(installedIds);

    return gameCatalog.map((game) => ({
      ...game,
      owned: ownedSet.has(game.id),
      wishlist: wishlistSet.has(game.id),
      installed: installedSet.has(game.id)
    }));
  }, [installedIds, ownedIds, wishlistIds]);

  const featuredGame = useMemo(
    () => catalog.find((game) => game.id === featuredGameId) || catalog[0],
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

  const signInWithMockOAuth = async ({ email, name, provider }) => {
    const profile = {
      email: email.toLowerCase(),
      name,
      provider,
      oauthId: email.split("@")[0] || "player"
    };

    const code = buildMockOAuthCode(profile);
    const payload = await apiRequest(`/auth/callback?format=json&code=${encodeURIComponent(code)}`, {
      auth: false
    });

    saveToken(payload.token);
    saveUser(payload.user);
    setCurrentUser(payload.user);

    return payload.user;
  };

  const signOut = () => {
    clearToken();
    clearUser();
    setCurrentUser(buildDefaultUser());
  };

  const toggleWishlist = (gameId) => {
    setWishlistIds((current) =>
      current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId]
    );
  };

  const toggleCart = (gameId) => {
    setCartIds((current) =>
      current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId]
    );
  };

  const removeFromCart = (gameId) => {
    setCartIds((current) => current.filter((id) => id !== gameId));
  };

  const toggleInstalled = (gameId) => {
    setInstalledIds((current) =>
      current.includes(gameId) ? current.filter((id) => id !== gameId) : [...current, gameId]
    );
  };

  const dismissNotification = (notificationId) => {
    setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
  };

  const value = {
    catalog,
    featuredGame,
    cartItems,
    cartTotal,
    wishlistItems,
    ownedGames,
    installedGames,
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
    notifications,
    dismissNotification,
    currentUser,
    setCurrentUser,
    signInWithMockOAuth,
    signOut,
    language,
    setLanguage,
    isAuthenticated: Boolean(getStoredToken())
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