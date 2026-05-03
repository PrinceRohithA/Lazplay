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
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [headerDocked, setHeaderDocked] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const [sideCollapsed, setSideCollapsed] = useState(true);

  useEffect(() => {
    setNotificationsOpen(false);
    setProfileOpen(false);
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
      <aside className={`side-menu panel ${sideCollapsed ? "collapsed" : ""}`}>
        <div className={"side-top"}>
          <button
            type="button"
            className={`icon-button menu-toggle ${sideCollapsed ? "floating" : ""}`}
            aria-label={sideCollapsed ? "Open menu" : "Close menu"}
            onClick={() => setSideCollapsed((s) => !s)}
          >
            {/* hamburger / close icon */}
            {sideCollapsed ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6H21M3 12H21M3 18H21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>

          <Link className="brand" to="/" aria-label="Go to LazPlay home">
            <span className="brand-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7h16v10H4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/><path d="M8 11h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            </span>
            {!sideCollapsed && (
              <span>
                <strong>LazPlay</strong>
                <small>Open game market</small>
              </span>
            )}
          </Link>

        </div>

        {!sideCollapsed && (
          <nav className="side-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === "/"}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </aside>

      <div className="right-profile">
        <div className="header-actions">
          {isAuthenticated ? (
            <button type="button" className="profile-pill" onClick={() => setProfileOpen((current) => !current)}>
              <span className="avatar-circle">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {notifications.some((n) => n.unread) && <span className="notification-count">{notifications.filter(n=>n.unread).length}</span>}
              </span>
              {!sideCollapsed && (
                <span className="profile-copy">
                  <strong>{currentUser.name}</strong>
                  <small>{roleLabel(currentUser.role)}</small>
                </span>
              )}
            </button>
          ) : (
            <button type="button" className="button primary" onClick={() => navigate("/login")}>
              Sign in
            </button>
          )}
        </div>

        {profileOpen && isAuthenticated && (
          <div className="dropdown-panel panel dropdown-profile right-pane">
            <div className="profile-summary">
              <span className="avatar-circle large">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </span>
              <div>
                <strong>{currentUser.name}</strong>
                <p>{currentUser.email}</p>
              </div>
            </div>
            <div className="dropdown-title">
              <strong>Account</strong>
            </div>
            <button type="button" onClick={() => navigate("/notifications")}>Notifications <span className="muted">({notifications.filter(n=>n.unread).length} unread)</span></button>
            <button type="button" onClick={() => navigate("/cart")}>Cart <span className="muted">({cartItems.length})</span></button>
            {currentUser.balance && <div className="balance">Balance: <strong>{currentUser.balance}</strong></div>}
            <hr />
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
