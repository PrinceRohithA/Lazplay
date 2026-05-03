import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStorefront } from "../context/StorefrontContext.jsx";

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

function roleLabel(role) {
  return String(role || "player").replace(/^\w/, (letter) => letter.toUpperCase());
}

export default function StorefrontLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    catalog,
    canAdmin,
    canCreate,
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
  const [headerDocked, setHeaderDocked] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
    setSearchFocused(false);
  }, [location.pathname]);

  useEffect(() => {
    let lastY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const delta = currentY - lastY;

      setHeaderDocked(currentY > 72);

      if (currentY < 40) {
        setHeaderHidden(false);
      } else if (delta > 5) {
        setHeaderHidden(true);
      } else if (delta < -5) {
        setHeaderHidden(false);
      }

      lastY = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const navItems = useMemo(() => {
    const items = [
      { to: "/", label: "Home" },
      { to: "/store", label: "Store" },
      { to: "/library", label: "Library" },
      { to: "/community", label: "Community" }
    ];

    if (canCreate) {
      items.push({ to: "/creator", label: "Creator" });
    }

    if (canAdmin) {
      items.push({ to: "/admin", label: "Admin" });
    }

    return items;
  }, [canAdmin, canCreate]);

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
      <aside className={`side-menu panel`}>
        <Link className="brand" to="/" aria-label="Go to LazPlay home">
          <span className="brand-badge">L</span>
          <span>
            <strong>LazPlay</strong>
            <small>Open game market</small>
          </span>
        </Link>

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
                <span>Matches</span>
                <span>{suggestions.length}</span>
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
                      {game.developer} - {game.price === 0 ? "Free" : `$${game.price.toFixed(2)}`}
                    </small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="side-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="right-profile">
        <div className="header-actions">
          <button
            type="button"
            className="icon-button"
            onClick={() => setNotificationsOpen((current) => !current)}
            aria-label="Open notifications"
          >
            <span className="icon-mark">!</span>
            <span>{notifications.length}</span>
          </button>

          <button type="button" className="icon-button" onClick={() => navigate("/cart")} aria-label="Open cart">
            <span className="icon-mark">$</span>
            <span>{cartItems.length}</span>
          </button>

          {isAuthenticated ? (
            <button type="button" className="profile-pill" onClick={() => setProfileOpen((current) => !current)}>
              <span className="avatar-circle">{getShortName(currentUser.name)}</span>
              <span className="profile-copy">
                <strong>{currentUser.name}</strong>
                <small>{roleLabel(currentUser.role)}</small>
              </span>
            </button>
          ) : (
            <button type="button" className="button primary" onClick={() => navigate("/login")}>
              Sign in
            </button>
          )}
        </div>

        {notificationsOpen && (
          <div className="dropdown-panel panel dropdown-notifications right-pane">
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
          <div className="dropdown-panel panel dropdown-profile right-pane">
            <div className="profile-summary">
              <span className="avatar-circle large">{getShortName(currentUser.name)}</span>
              <div>
                <strong>{currentUser.name}</strong>
                <p>{currentUser.email}</p>
              </div>
            </div>
            <button type="button" onClick={() => navigate("/profile")}>Profile</button>
            <button type="button" onClick={() => navigate("/settings")}>Settings</button>
            {canCreate && <button type="button" onClick={() => navigate("/creator")}>Creator dashboard</button>}
            {canAdmin && <button type="button" onClick={() => navigate("/admin")}>Admin console</button>}
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
      </div>

      <main className="page-shell with-side">
        <Outlet />
      </main>

      <footer className="site-footer panel">
        <div>
          <strong>LazPlay</strong>
          <p>Self-hosted game store with player libraries, creator uploads, and community threads.</p>
        </div>

        <nav aria-label="Footer links">
          <a href="#about">About</a>
          <a href="#support">Support</a>
          <a href="#terms">Terms</a>
          <a href="#privacy">Privacy</a>
        </nav>

        <div className="footer-meta">
          <div className="social-row" aria-label="Social links">
            <span>X</span>
            <span>GH</span>
            <span>RSS</span>
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
        {navItems.slice(0, 5).map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
