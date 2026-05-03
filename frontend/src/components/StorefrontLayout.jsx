import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStorefront } from "../context/StorefrontContext.jsx";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/store", label: "Store" },
  { to: "/library", label: "Library" },
  { to: "/community", label: "Community" },
  { to: "/developer", label: "Upload" }
];

function getShortName(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return "LP";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

export default function StorefrontLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    catalog,
    cartItems,
    currentUser,
    isAuthenticated,
    language,
    notifications,
    quickFilter,
    searchTerm,
    setLanguage,
    setQuickFilter,
    setSearchTerm,
    signOut
  } = useStorefront();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
    setSearchFocused(false);
  }, [location.pathname]);

  const suggestions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return catalog
      .filter((game) => {
        const matchesQuery =
          !query ||
          [game.title, game.developer, game.genre, ...game.tags]
            .join(" ")
            .toLowerCase()
            .includes(query);

        const matchesFilter =
          quickFilter === "all" ||
          (quickFilter === "free" && game.price === 0) ||
          (quickFilter === "paid" && game.price > 0) ||
          (quickFilter === "indie" && game.tags.includes("Indie")) ||
          (quickFilter === "top" && game.rating >= 4.7);

        return matchesQuery && matchesFilter;
      })
      .slice(0, 6);
  }, [catalog, quickFilter, searchTerm]);

  return (
    <div className="app-shell">
      <header className="site-header panel">
        <Link className="brand" to="/" aria-label="Go to LazPlay home">
          <span className="brand-badge">L</span>
          <span>
            <strong>LazPlay</strong>
            <small>Black storefront</small>
          </span>
        </Link>

        <div className="header-center">
          <div className="search-shell">
            <input
              aria-label="Search games"
              className="search-input"
              placeholder="Search games, tags, developers..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => setSearchFocused(true)}
            />
            {(searchFocused || searchTerm.trim()) && (
              <div className="search-suggestions panel">
                <div className="suggestion-meta">
                  <span>Instant suggestions</span>
                  <span>{suggestions.length} matches</span>
                </div>
                {suggestions.map((game) => (
                  <button
                    type="button"
                    key={game.id}
                    className="suggestion-row"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => navigate(`/game/${game.id}`)}
                  >
                    <span className="suggestion-cover" style={{ background: game.art }} />
                    <span>
                      <strong>{game.title}</strong>
                      <small>
                        {game.developer} · {game.price === 0 ? "Free" : `$${game.price.toFixed(2)}`}
                      </small>
                    </span>
                  </button>
                ))}
                <div className="filter-pills">
                  {[
                    ["all", "All"],
                    ["free", "Free"],
                    ["paid", "Paid"],
                    ["indie", "Indie"],
                    ["top", "Top Rated"]
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className={`chip ${quickFilter === value ? "active" : ""}`}
                      onClick={() => setQuickFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <nav className="site-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setNotificationsOpen((current) => !current)}
          >
            <span className="icon-mark">N</span>
            <span>{notifications.length}</span>
          </button>

          <button type="button" className="icon-button" onClick={() => navigate("/cart")}>
            <span className="icon-mark">C</span>
            <span>{cartItems.length}</span>
          </button>

          {isAuthenticated ? (
            <button type="button" className="profile-pill" onClick={() => setProfileOpen((current) => !current)}>
              <span className="avatar-circle">{getShortName(currentUser.name)}</span>
              <span className="profile-copy">
                <strong>{currentUser.name}</strong>
                <small>{currentUser.role || "Player"}</small>
              </span>
            </button>
          ) : (
            <button type="button" className="button primary" onClick={() => navigate("/login")}>
              Sign in
            </button>
          )}
        </div>

        {notificationsOpen && (
          <div className="dropdown-panel panel dropdown-notifications">
            <div className="dropdown-title">
              <strong>Notifications</strong>
              <button type="button" className="text-link" onClick={() => navigate("/notifications")}>Open all</button>
            </div>
            {notifications.slice(0, 3).map((item) => (
              <article key={item.id} className="notification-row">
                <span className={`notification-dot ${item.unread ? "unread" : ""}`} />
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {profileOpen && isAuthenticated && (
          <div className="dropdown-panel panel dropdown-profile">
            <div className="profile-summary">
              <span className="avatar-circle large">{getShortName(currentUser.name)}</span>
              <div>
                <strong>{currentUser.name}</strong>
                <p>{currentUser.email}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate("/profile")}>Profile</button>
            <button type="button" onClick={() => navigate("/settings")}>Settings</button>
            <button
              type="button"
              onClick={() => {
                signOut();
                navigate("/login");
              }}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main className="page-shell">
        <Outlet />
      </main>

      <footer className="site-footer panel">
        <div>
          <strong>LazPlay</strong>
          <p>Black-themed distribution platform for self-hosted games, community, and developer workflows.</p>
        </div>

        <nav aria-label="Footer links">
          <a href="#about">About</a>
          <a href="#support">Support</a>
          <a href="#terms">Terms</a>
          <a href="#privacy">Privacy</a>
        </nav>

        <div className="footer-meta">
          <div className="social-row" aria-label="Social links">
            <span>𝕏</span>
            <span>◐</span>
            <span>⌂</span>
          </div>
          <label>
            Language
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option>English</option>
              <option>Spanish</option>
              <option>French</option>
              <option>Japanese</option>
            </select>
          </label>
        </div>
      </footer>

      <nav className="bottom-nav panel" aria-label="Mobile navigation">
        {navItems.slice(0, 4).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}